import type { Commodity, PriceRow, Terminal } from '../data/types'
import { routeKey } from './routeMarks'
import { computeRoutes, demandOf, evaluateLeg, routeFilters, stockOf, type RouteInput, type RouteOption } from './routes'

export interface TradePath {
  legs: RouteOption[]
  total: number

  short: boolean

  capped?: boolean
}

export type DistanceOf = (from: number, to: number) => number | null | undefined

const BEAM_PER_FIRST = 4
const EXPAND = 6
const FIRST_CANDIDATES = 15
const GREEDY_OPTIONS = 5
const GREEDY_FIRSTS = 30
export const ROUNDABOUT_MAX_LEGS = 10

interface Used {
  bought: Map<number, number>
  sold: Map<number, number>
}

interface State extends Used {
  legs: RouteOption[]
  total: number
  money: number
  at: number
  done: boolean
}

function makeCtx(prices: PriceRow[], commodities: Commodity[], terminals: Map<number, Terminal>, input: RouteInput) {
  const buysAt = new Map<number, PriceRow[]>()
  const sellsOf = new Map<number, PriceRow[]>()
  for (const p of prices) {
    if (p.price_buy > 0) {
      const list = buysAt.get(p.id_terminal) ?? []
      list.push(p)
      buysAt.set(p.id_terminal, list)
    }
    if (p.price_sell > 0) {
      const list = sellsOf.get(p.id_commodity) ?? []
      list.push(p)
      sellsOf.set(p.id_commodity, list)
    }
  }
  return { buysAt, sellsOf, f: routeFilters(commodities, terminals, input), input }
}
type Ctx = ReturnType<typeof makeCtx>

function legsFrom(ctx: Ctx, at: number, money: number, used: Used, opts: { to?: number; exclude?: Set<string> } = {}): RouteOption[] {
  const { f, input } = ctx
  if (f.avoided(at)) return []
  const out: RouteOption[] = []
  for (const buy of ctx.buysAt.get(at) ?? []) {
    const c = f.commodity(buy.id_commodity)
    if (!c) continue
    const stock = stockOf(buy)
    const stockLeft = stock > 0 ? stock - (used.bought.get(buy.id) ?? 0) : 0
    if (stock > 0 && stockLeft <= 0) continue
    for (const sell of ctx.sellsOf.get(buy.id_commodity) ?? []) {
      if (sell.id_terminal === at || sell.price_sell <= buy.price_buy) continue
      if (opts.to !== undefined && sell.id_terminal !== opts.to) continue
      if (f.avoided(sell.id_terminal)) continue
      const key = routeKey({ commodityId: c.id, buy, sell })
      if (f.hidden(key) || opts.exclude?.has(key)) continue
      const demand = demandOf(sell)
      const demandLeft = demand > 0 ? demand - (used.sold.get(sell.id) ?? 0) : 0
      if (demand > 0 && demandLeft <= 0) continue
      const leg = evaluateLeg(c, buy, sell, input.shipScu, money, stockLeft, demandLeft, { stock: stock > 0, demand: demand > 0 })
      if (leg) out.push(leg)
    }
  }
  return out.sort((a, b) => b.profit - a.profit)
}

const emptyUsed = (): Used => ({ bought: new Map(), sold: new Map() })

function extend(s: { legs: RouteOption[]; total: number; money: number } & Used, leg: RouteOption): State {
  const bought = new Map(s.bought)
  const sold = new Map(s.sold)
  bought.set(leg.buy.id, (bought.get(leg.buy.id) ?? 0) + leg.qty)
  sold.set(leg.sell.id, (sold.get(leg.sell.id) ?? 0) + leg.qty)
  return { legs: [...s.legs, leg], total: s.total + leg.profit, money: s.money + leg.profit, at: leg.sell.id_terminal, done: false, bought, sold }
}

const start = (money: number, at: number): State => ({ legs: [], total: 0, money, at, done: false, ...emptyUsed() })

const byQuality = (n: number) => (a: TradePath, b: TradePath) => Number(b.legs.length >= n) - Number(a.legs.length >= n) || b.total - a.total

function beam(ctx: Ctx, initial: State, n: number, width: number): State[] {
  let states = [initial]
  while (states.some((s) => !s.done && s.legs.length < n)) {
    const next: State[] = []
    for (const s of states) {
      if (s.done || s.legs.length >= n) {
        next.push(s)
        continue
      }
      const exclude = new Set(s.legs.map(routeKey))
      const opts = legsFrom(ctx, s.at, s.money, s, { exclude }).slice(0, EXPAND)
      if (opts.length === 0) next.push({ ...s, done: true })
      else for (const o of opts) next.push(extend(s, o))
    }
    states = next.sort((a, b) => b.total - a.total).slice(0, width)
  }
  return states
}

const toPath = (s: State, n: number): TradePath => ({ legs: s.legs, total: s.total, short: s.legs.length < n })

function topByProfit(prices: PriceRow[], commodities: Commodity[], terminals: Map<number, Terminal>, input: RouteInput, limit: number): RouteOption[] {
  const r = computeRoutes(prices, commodities, terminals, { ...input, sortBy: 'profit' }, limit)
  return r.ok ? r.routes : []
}

export function bestPaths(
  prices: PriceRow[],
  commodities: Commodity[],
  terminals: Map<number, Terminal>,
  input: RouteInput,
  { legs: n, start: from, count = 3 }: { legs: number; start?: number | null; count?: number },
): TradePath[] {
  if (!(input.shipScu > 0) || !(input.budget > 0) || n < 1) return []
  const ctx = makeCtx(prices, commodities, terminals, input)

  const firsts = from != null ? legsFrom(ctx, from, input.budget, emptyUsed()).slice(0, FIRST_CANDIDATES) : topByProfit(prices, commodities, terminals, input, FIRST_CANDIDATES)
  return firsts
    .map((r) => beam(ctx, extend(start(input.budget, r.buy.id_terminal), r), n, BEAM_PER_FIRST).map((s) => toPath(s, n)).sort(byQuality(n))[0])
    .sort(byQuality(n))
    .slice(0, count)
}

const rate = (profit: number, d: number) => profit / Math.max(d, 1)

export function rankByDistance<T extends Pick<RouteOption, 'profit' | 'buy' | 'sell'>>(routes: T[], distanceOf: DistanceOf): T[] {
  const d = (r: T) => distanceOf(r.buy.id_terminal, r.sell.id_terminal)
  const known = routes.filter((r) => typeof d(r) === 'number')
  const unknown = routes.filter((r) => typeof d(r) !== 'number')
  known.sort((a, b) => rate(b.profit, d(b) as number) - rate(a.profit, d(a) as number))
  unknown.sort((a, b) => b.profit - a.profit)
  return [...known, ...unknown]
}

export function greedyPaths(
  prices: PriceRow[],
  commodities: Commodity[],
  terminals: Map<number, Terminal>,
  input: RouteInput,
  { legs: n, start: from, count = 3 }: { legs: number; start?: number | null; count?: number },
  distanceOf: DistanceOf,
): { paths: TradePath[]; pending: [number, number][] } {
  const pending = new Map<string, [number, number]>()
  if (!(input.shipScu > 0) || !(input.budget > 0) || n < 1) return { paths: [], pending: [] }
  const ctx = makeCtx(prices, commodities, terminals, input)
  const ask = (opts: RouteOption[]) => {
    let missing = false
    for (const o of opts)
      if (distanceOf(o.buy.id_terminal, o.sell.id_terminal) === undefined) {
        pending.set(`${o.buy.id_terminal}:${o.sell.id_terminal}`, [o.buy.id_terminal, o.sell.id_terminal])
        missing = true
      }
    return missing
  }

  const firsts =
    from != null
      ? legsFrom(ctx, from, input.budget, emptyUsed()).slice(0, GREEDY_OPTIONS)
      : topByProfit(prices, commodities, terminals, input, GREEDY_FIRSTS)
  if (ask(firsts)) return { paths: [], pending: [...pending.values()] }

  const paths: TradePath[] = []
  for (const first of rankByDistance(firsts, distanceOf).slice(0, count)) {
    let s = extend(start(input.budget, first.buy.id_terminal), first)
    while (s.legs.length < n) {
      const opts = legsFrom(ctx, s.at, s.money, s, { exclude: new Set(s.legs.map(routeKey)) }).slice(0, GREEDY_OPTIONS)
      if (opts.length === 0 || ask(opts)) break
      s = extend(s, rankByDistance(opts, distanceOf)[0])
    }
    paths.push(toPath(s, n))
  }
  return { paths, pending: [...pending.values()] }
}

function simulateRoundabout(ctx: Ctx, a: number, b: number, budget: number): TradePath | null {
  let s = start(budget, a)
  let to = b
  while (s.legs.length < ROUNDABOUT_MAX_LEGS) {
    const [best] = legsFrom(ctx, s.at, s.money, s, { to })
    if (!best) break
    s = extend(s, best)
    to = to === b ? a : b
  }
  if (s.legs.length < 2) return null
  return { legs: s.legs, total: s.total, short: false, capped: s.legs.length >= ROUNDABOUT_MAX_LEGS }
}

export function roundabouts(
  prices: PriceRow[],
  commodities: Commodity[],
  terminals: Map<number, Terminal>,
  input: RouteInput,
  { start: from, count = 3 }: { start?: number | null; count?: number },
): TradePath[] {
  if (!(input.shipScu > 0) || !(input.budget > 0)) return []
  const ctx = makeCtx(prices, commodities, terminals, input)
  const pairs = new Map<string, [number, number]>()
  const add = (a: number, b: number) => {
    const k = [a, b].sort((x, y) => x - y).join(':')
    if (!pairs.has(k)) pairs.set(k, [a, b])
  }
  if (from != null) for (const o of legsFrom(ctx, from, input.budget, emptyUsed())) add(from, o.sell.id_terminal)
  else for (const o of topByProfit(prices, commodities, terminals, input, 40)) add(o.buy.id_terminal, o.sell.id_terminal)
  const out: TradePath[] = []
  for (const [a, b] of [...pairs.values()].slice(0, 40)) {
    const p = simulateRoundabout(ctx, a, b, input.budget)
    if (p) out.push(p)
  }
  return out.sort((x, y) => y.total - x.total).slice(0, count)
}

export function rankRoundabouts(list: TradePath[], distanceOf: DistanceOf): TradePath[] {
  const d = (p: TradePath) => distanceOf(p.legs[0].buy.id_terminal, p.legs[0].sell.id_terminal)
  const known = list.filter((p) => typeof d(p) === 'number')
  const unknown = list.filter((p) => typeof d(p) !== 'number')
  const score = (p: TradePath) => p.total / (Math.max(d(p) as number, 1) * p.legs.length)
  return [...known.sort((a, b) => score(b) - score(a)), ...unknown.sort((a, b) => b.total - a.total)]
}

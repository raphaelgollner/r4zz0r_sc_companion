import type { Commodity, PriceRow, Terminal, Vehicle } from '../data/types'
import { avoidMatch, type AvoidEntry } from './avoid'
import { riskAllowed, riskOf, type MaxRisk } from './risk'
import { routeKey } from './routeMarks'

export type LimitedBy = 'nave' | 'dinheiro' | 'estoque' | 'demanda'

export interface RouteInput {
  shipScu: number
  budget: number
  excludeIllegal: boolean
  originSystem?: string
  /** Rotas com compra ou venda nesses lugares são descartadas. */
  avoid?: AvoidEntry[]
  /** Rotas ocultas pelo jogador: saem antes do limite. */
  hiddenKeys?: ReadonlySet<string>
  /** Só estas rotas (lista de ocultas). */
  onlyKeys?: ReadonlySet<string>
  /** Nível de perigo máximo aceito na compra e na venda. */
  maxRisk?: MaxRisk
  /** Nave que só carrega em doca de carga externa: só terminais com doca (compra e venda). */
  dockOnly?: boolean
  sortBy: 'profit' | 'roi'
}

export interface RouteOption {
  commodityId: number
  commodityName: string
  buy: PriceRow
  sell: PriceRow
  qty: number
  limitedBy: LimitedBy
  stockKnown: boolean
  demandKnown: boolean
  cost: number
  revenue: number
  profit: number
  roi: number
}

export type RouteResult = { ok: true; routes: RouteOption[] } | { ok: false; reason: 'nave_sem_carga' | 'sem_orcamento' }

export const stockOf = (r: PriceRow) => (r.scu_buy > 0 ? r.scu_buy : r.scu_buy_avg)
export const demandOf = (r: PriceRow) => (r.scu_sell > 0 ? r.scu_sell : r.scu_sell_avg)

/**
 * Um trecho compra → venda: quanto levar e quanto rende. `stock`/`demand` = 0 quando desconhecidos.
 * Devolve null quando não dá para levar nada.
 */
export function evaluateLeg(
  c: Commodity,
  buy: PriceRow,
  sell: PriceRow,
  shipScu: number,
  budget: number,
  stock: number,
  demand: number,
  known = { stock: stock > 0, demand: demand > 0 },
): RouteOption | null {
  // Ordem importa: em empate, vale o primeiro limitador da lista.
  const limits: [LimitedBy, number][] = [
    ['nave', shipScu],
    ['dinheiro', budget / buy.price_buy],
  ]
  if (stock > 0) limits.push(['estoque', stock])
  if (demand > 0) limits.push(['demanda', demand])
  const min = Math.min(...limits.map(([, v]) => v))
  const qty = Math.floor(min)
  if (qty <= 0) return null
  const limitedBy = limits.find(([, v]) => v === min)![0]
  const cost = qty * buy.price_buy
  const revenue = qty * sell.price_sell
  return {
    commodityId: c.id,
    commodityName: c.name,
    buy,
    sell,
    qty,
    limitedBy,
    stockKnown: known.stock,
    demandKnown: known.demand,
    cost,
    revenue,
    profit: revenue - cost,
    roi: ((revenue - cost) / cost) * 100,
  }
}

/** Terminal com doca de carga externa (UEX). Desconhecido conta como sem doca. */
export const hasLoadingDock = (t: Terminal | undefined) => t?.has_loading_dock === 1

/** Nave que só carrega em doca de carga externa (UEX; ex.: Hull C). */
export const needsLoadingDock = (v: Vehicle | null | undefined) => v?.is_loading_dock === 1

/** Filtros comuns das rotas: mercadoria permitida, terminal evitado (Evitar/Risco), rota oculta. */
export function routeFilters(commodities: Commodity[], terminals: Map<number, Terminal>, input: RouteInput) {
  const avoid = input.avoid ?? []
  const maxRisk = input.maxRisk ?? 'any'
  const byId = new Map(commodities.map((c) => [c.id, c]))
  return {
    commodity: (id: number): Commodity | null => {
      const c = byId.get(id)
      return !c || (input.excludeIllegal && c.is_illegal) ? null : c
    },
    avoided: (id: number) =>
      avoidMatch(terminals.get(id), avoid) ||
      !riskAllowed(riskOf(terminals.get(id)), maxRisk) ||
      (!!input.dockOnly && !hasLoadingDock(terminals.get(id))),
    hidden: (key: string) => !!input.hiddenKeys?.has(key) || (!!input.onlyKeys && !input.onlyKeys.has(key)),
  }
}

/** Calcula as melhores rotas compra → venda para a nave e o orçamento informados (spec §7.1). */
export function computeRoutes(
  prices: PriceRow[],
  commodities: Commodity[],
  terminals: Map<number, Terminal>,
  input: RouteInput,
  limit = 50,
): RouteResult {
  if (!(input.shipScu > 0)) return { ok: false, reason: 'nave_sem_carga' }
  if (!(input.budget > 0)) return { ok: false, reason: 'sem_orcamento' }

  const f = routeFilters(commodities, terminals, input)
  const groups = new Map<number, { buys: PriceRow[]; sells: PriceRow[] }>()
  for (const p of prices) {
    let g = groups.get(p.id_commodity)
    if (!g) groups.set(p.id_commodity, (g = { buys: [], sells: [] }))
    if (p.price_buy > 0) g.buys.push(p)
    if (p.price_sell > 0) g.sells.push(p)
  }

  const out: RouteOption[] = []
  for (const [commodityId, { buys, sells }] of groups) {
    const c = f.commodity(commodityId)
    if (!c) continue

    for (const buy of buys) {
      if (input.originSystem && terminals.get(buy.id_terminal)?.star_system_name !== input.originSystem) continue
      if (f.avoided(buy.id_terminal)) continue
      const stock = stockOf(buy)

      for (const sell of sells) {
        if (sell.id_terminal === buy.id_terminal || sell.price_sell <= buy.price_buy || f.avoided(sell.id_terminal)) continue
        if (f.hidden(routeKey({ commodityId, buy, sell }))) continue
        const leg = evaluateLeg(c, buy, sell, input.shipScu, input.budget, stock, demandOf(sell))
        if (leg) out.push(leg)
      }
    }
  }

  const key = input.sortBy === 'roi' ? (r: RouteOption) => r.roi : (r: RouteOption) => r.profit
  out.sort((a, b) => key(b) - key(a))
  return { ok: true, routes: out.slice(0, limit) }
}

import type { Commodity, PriceRow, Terminal } from '../data/types'
import { avoidMatch, type AvoidEntry } from './avoid'

export type LimitedBy = 'nave' | 'dinheiro' | 'estoque' | 'demanda'

export interface RouteInput {
  shipScu: number
  budget: number
  excludeIllegal: boolean
  originSystem?: string
  /** Rotas com compra ou venda nesses lugares são descartadas. */
  avoid?: AvoidEntry[]
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

const stockOf = (r: PriceRow) => (r.scu_buy > 0 ? r.scu_buy : r.scu_buy_avg)
const demandOf = (r: PriceRow) => (r.scu_sell > 0 ? r.scu_sell : r.scu_sell_avg)

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

  const avoid = input.avoid ?? []
  const avoided = (id: number) => avoidMatch(terminals.get(id), avoid)
  const byId = new Map(commodities.map((c) => [c.id, c]))
  const groups = new Map<number, { buys: PriceRow[]; sells: PriceRow[] }>()
  for (const p of prices) {
    let g = groups.get(p.id_commodity)
    if (!g) groups.set(p.id_commodity, (g = { buys: [], sells: [] }))
    if (p.price_buy > 0) g.buys.push(p)
    if (p.price_sell > 0) g.sells.push(p)
  }

  const out: RouteOption[] = []
  for (const [commodityId, { buys, sells }] of groups) {
    const c = byId.get(commodityId)
    if (!c) continue
    if (input.excludeIllegal && c.is_illegal) continue

    for (const buy of buys) {
      if (input.originSystem && terminals.get(buy.id_terminal)?.star_system_name !== input.originSystem) continue
      if (avoided(buy.id_terminal)) continue
      const stock = stockOf(buy)

      for (const sell of sells) {
        if (sell.id_terminal === buy.id_terminal || sell.price_sell <= buy.price_buy || avoided(sell.id_terminal)) continue
        const demand = demandOf(sell)

        // Ordem importa: em empate, vale o primeiro limitador da lista.
        const limits: [LimitedBy, number][] = [
          ['nave', input.shipScu],
          ['dinheiro', input.budget / buy.price_buy],
        ]
        if (stock > 0) limits.push(['estoque', stock])
        if (demand > 0) limits.push(['demanda', demand])
        const min = Math.min(...limits.map(([, v]) => v))
        const qty = Math.floor(min)
        if (qty <= 0) continue
        const limitedBy = limits.find(([, v]) => v === min)![0]

        const cost = qty * buy.price_buy
        const revenue = qty * sell.price_sell
        out.push({
          commodityId,
          commodityName: c.name,
          buy,
          sell,
          qty,
          limitedBy,
          stockKnown: stock > 0,
          demandKnown: demand > 0,
          cost,
          revenue,
          profit: revenue - cost,
          roi: ((revenue - cost) / cost) * 100,
        })
      }
    }
  }

  const key = input.sortBy === 'roi' ? (r: RouteOption) => r.roi : (r: RouteOption) => r.profit
  out.sort((a, b) => key(b) - key(a))
  return { ok: true, routes: out.slice(0, limit) }
}

import type { Commodity, PriceRow, Terminal } from '../data/types'
import type { ImportData, LogEvent } from './gamelog'
import type { ProgressData, Tx } from './progress'

export interface ImportContext {
  names: Map<string, string>
  commodities: Commodity[]
  terminals: Terminal[]
  prices: PriceRow[]
}

export const ESTIMATED = '≈ '

const norm = (s: string | null | undefined) => (s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

function placeMatches(t: Terminal, place: string) {
  const p = norm(place)
  if (!p) return false
  return [t.displayname, t.name, t.space_station_name, t.city_name, t.outpost_name].some((v) => norm(v) === p) || norm(t.displayname).startsWith(p + ' ')
}

export function importToProgress(imp: ImportData, ctx: ImportContext): ProgressData {
  const byName = new Map(ctx.commodities.map((c) => [norm(c.name), c]))
  const tradeTerminals = ctx.terminals.filter((t) => t.type === 'commodity' || t.type === 'commodity_raw')
  const synthetic = new Map<string, number>()
  const fakeId = (key: string) => {
    if (!synthetic.has(key)) synthetic.set(key, -(synthetic.size + 1))
    return synthetic.get(key)!
  }

  const terminalFor = (e: Extract<LogEvent, { kind: 'buy' | 'sell' }>, commodityId: number) => {
    if (!e.place) return { terminalId: undefined, terminalName: undefined }
    const here = tradeTerminals.filter((t) => placeMatches(t, e.place!))
    let best = here[0]
    if (here.length > 1) {
      const price = (t: Terminal) => {
        const r = ctx.prices.find((p) => p.id_terminal === t.id && p.id_commodity === commodityId)
        const v = r ? (e.kind === 'buy' ? r.price_buy : r.price_sell) : 0
        return v > 0 ? Math.abs(v - e.pricePerScu) : Infinity
      }
      best = [...here].sort((a, b) => price(a) - price(b))[0]
    }
    if (best) return { terminalId: best.id, terminalName: ESTIMATED + best.displayname }
    return { terminalId: fakeId('place:' + e.place), terminalName: ESTIMATED + e.place }
  }

  const txs: Tx[] = []
  for (const s of imp.sessions) {
    for (const e of s.events) {
      const base = { id: e.key, amount: e.amount, kind: 'normal' as const, at: e.at, sessionId: s.id }
      if (e.kind === 'buy' || e.kind === 'sell') {
        const name = ctx.names.get(e.resource) ?? e.resource
        const c = byName.get(norm(name))
        const commodityId = c?.id ?? fakeId('res:' + e.resource)
        txs.push({
          ...base,
          category: 'trade',
          description: '',
          commodityId,
          commodityName: c?.name ?? name,
          scu: e.scu,
          pricePerScu: e.pricePerScu,
          ...terminalFor(e, commodityId),
        })
      } else if (e.kind === 'shop') txs.push({ ...base, category: 'purchase', description: e.item })
      else txs.push({ ...base, category: 'other', description: 'contract' })
    }
  }

  return {
    profile: { name: imp.player ?? '', photo: null },
    txs,
    sessions: imp.sessions.map((s) => ({ id: s.id, startedAt: s.startedAt, endedAt: s.endedAt })),
  }
}

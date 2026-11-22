export type MarkKind = 'done' | 'lowStock' | 'noDemand' | 'priceOff' | 'danger' | 'hidden'

export const MARK_KINDS: MarkKind[] = ['done', 'lowStock', 'noDemand', 'priceOff', 'danger', 'hidden']

export const EXPIRING: ReadonlySet<MarkKind> = new Set(['done', 'lowStock', 'noDemand', 'priceOff'])

export interface MarkRecord {
  marks: MarkKind[]

  buyAt: number
  sellAt: number

  commodityName: string
  buyName: string
  sellName: string
}

export interface MarkableRoute {
  commodityId: number
  commodityName: string
  buy: { id_terminal: number; date_modified: number; terminal_name: string }
  sell: { id_terminal: number; date_modified: number; terminal_name: string }
}

export const routeKey = (r: Pick<MarkableRoute, 'commodityId' | 'buy' | 'sell'>) => `${r.commodityId}:${r.buy.id_terminal}:${r.sell.id_terminal}`

export function activeMarks(rec: MarkRecord | undefined, buyAt: number, sellAt: number): MarkKind[] {
  if (!rec) return []
  const fresh = buyAt <= rec.buyAt && sellAt <= rec.sellAt
  return rec.marks.filter((m) => fresh || !EXPIRING.has(m))
}

export function toggleMark(rec: MarkRecord | undefined, kind: MarkKind, r: MarkableRoute): MarkRecord | undefined {
  const current = activeMarks(rec, r.buy.date_modified, r.sell.date_modified)
  const marks = current.includes(kind) ? current.filter((m) => m !== kind) : [...current, kind]
  if (marks.length === 0) return undefined
  return {
    marks,
    buyAt: r.buy.date_modified,
    sellAt: r.sell.date_modified,
    commodityName: r.commodityName,
    buyName: r.buy.terminal_name,
    sellName: r.sell.terminal_name,
  }
}

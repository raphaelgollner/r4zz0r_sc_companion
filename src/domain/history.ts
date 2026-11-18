import type { PriceHistoryPoint } from '../data/types'

/** Séries de compra e venda em ordem de data (zeros, que significam "sem preço", ficam de fora). */
export function historySeries(points: PriceHistoryPoint[]): { buy: number[]; sell: number[]; from: number; to: number } {
  const sorted = [...points].sort((a, b) => a.date_added - b.date_added)
  return {
    buy: sorted.filter((p) => p.price_buy > 0).map((p) => p.price_buy),
    sell: sorted.filter((p) => p.price_sell > 0).map((p) => p.price_sell),
    from: sorted[0]?.date_added ?? 0,
    to: sorted[sorted.length - 1]?.date_added ?? 0,
  }
}

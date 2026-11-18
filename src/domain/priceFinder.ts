import type { PriceRow } from '../data/types'

/** Melhores terminais para comprar (mais barato) ou vender (mais caro) uma commodity. */
export function bestPlaces(prices: PriceRow[], commodityId: number, side: 'buy' | 'sell', limit = 10): PriceRow[] {
  const field = side === 'buy' ? 'price_buy' : 'price_sell'
  return prices
    .filter((p) => p.id_commodity === commodityId && p[field] > 0)
    .sort((a, b) => (side === 'buy' ? a[field] - b[field] : b[field] - a[field]))
    .slice(0, limit)
}

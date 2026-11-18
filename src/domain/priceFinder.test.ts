import { describe, expect, test } from 'vitest'
import type { PriceRow } from '../data/types'
import { bestPlaces } from './priceFinder'

function row(id: number, id_commodity: number, price_buy: number, price_sell: number): PriceRow {
  return {
    id, id_commodity, id_terminal: id, price_buy, price_buy_avg: 0, price_sell, price_sell_avg: 0, scu_buy: 0,
    scu_buy_avg: 0, scu_sell_stock: 0, scu_sell: 0, scu_sell_avg: 0, status_buy: 0, status_sell: 0,
    date_modified: 1, commodity_name: 'X', terminal_name: `T${id}`,
  }
}

const prices = [row(1, 47, 7100, 0), row(2, 47, 7000, 8500), row(3, 47, 0, 8700), row(4, 47, 7200, 8400), row(5, 99, 1, 99999)]

describe('bestPlaces', () => {
  test('onde comprar: menor preço primeiro, ignora 0 e outras commodities', () => {
    expect(bestPlaces(prices, 47, 'buy').map((r) => r.id)).toEqual([2, 1, 4])
  })
  test('onde vender: maior preço primeiro, ignora 0', () => {
    expect(bestPlaces(prices, 47, 'sell').map((r) => r.id)).toEqual([3, 2, 4])
  })
  test('respeita o limite', () => {
    expect(bestPlaces(prices, 47, 'sell', 2)).toHaveLength(2)
  })
  test('sem preço devolve lista vazia', () => {
    expect(bestPlaces(prices, 123, 'buy')).toEqual([])
  })
})

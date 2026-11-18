import { describe, expect, test } from 'vitest'
import { historySeries } from './history'

describe('historySeries', () => {
  test('ordena por data e separa compra e venda, ignorando zeros', () => {
    const s = historySeries([
      { price_buy: 0, price_sell: 8700, date_added: 300 },
      { price_buy: 7000, price_sell: 8500, date_added: 100 },
      { price_buy: 7100, price_sell: 0, date_added: 200 },
    ])
    expect(s).toEqual({ buy: [7000, 7100], sell: [8500, 8700], from: 100, to: 300 })
  })
  test('vazio', () => expect(historySeries([])).toEqual({ buy: [], sell: [], from: 0, to: 0 }))
})

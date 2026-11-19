import { describe, expect, test } from 'vitest'
import type { Commodity, PriceRow, Terminal } from '../data/types'
import { computeRoutes, type RouteInput } from './routes'

function commodity(id: number, name: string, extra: Partial<Commodity> = {}): Commodity {
  return {
    id, name, code: name.slice(0, 4).toUpperCase(), kind: 'Metal', price_buy: 0, price_sell: 0,
    is_illegal: 0, is_harvestable: 0, is_raw: 0, is_refined: 1, is_buyable: 1, is_sellable: 1,
    ids_planets: null, ids_moons: null, date_modified: 1, ...extra,
  }
}

let nextId = 1
function price(id_commodity: number, id_terminal: number, extra: Partial<PriceRow>): PriceRow {
  return {
    id: nextId++, id_commodity, id_terminal, price_buy: 0, price_buy_avg: 0, price_sell: 0, price_sell_avg: 0,
    scu_buy: 0, scu_buy_avg: 0, scu_sell_stock: 0, scu_sell: 0, scu_sell_avg: 0, status_buy: 0, status_sell: 0,
    date_modified: 1_794_920_703, commodity_name: '', terminal_name: `T${id_terminal}`, ...extra,
  }
}

function terminal(id: number, system: string): Terminal {
  return {
    id, name: `T${id}`, displayname: `T${id}`, type: 'commodity', star_system_name: system, planet_name: null,
    moon_name: null, space_station_name: null, city_name: null, outpost_name: null,
  }
}

const laranite = commodity(47, 'Laranite')
const terminals = new Map([[8, terminal(8, 'Stanton')], [12, terminal(12, 'Stanton')], [20, terminal(20, 'Pyro')], [21, terminal(21, 'Pyro')]])
const buy8 = (extra: Partial<PriceRow> = {}) => price(47, 8, { price_buy: 7047, scu_buy: 434, ...extra })
const sell12 = (extra: Partial<PriceRow> = {}) => price(47, 12, { price_sell: 8500, scu_sell: 1000, ...extra })
const input = (extra: Partial<RouteInput> = {}): RouteInput => ({
  shipScu: 576, budget: 5_000_000, excludeIllegal: true, sortBy: 'profit', ...extra,
})

function routes(prices: PriceRow[], inp: RouteInput, commodities = [laranite]) {
  const r = computeRoutes(prices, commodities, terminals, inp)
  if (!r.ok) throw new Error(`esperava ok, veio ${r.reason}`)
  return r.routes
}

describe('computeRoutes', () => {
  test('limitado pelo estoque', () => {
    const [r] = routes([buy8(), sell12()], input())
    expect(r).toMatchObject({ qty: 434, limitedBy: 'estoque', cost: 3_058_398, revenue: 3_689_000, profit: 630_602 })
    expect(r.roi).toBeCloseTo(20.618, 2)
  })

  test('limitado pelo dinheiro', () => {
    const [r] = routes([buy8(), sell12()], input({ budget: 100_000 }))
    expect(r).toMatchObject({ qty: 14, limitedBy: 'dinheiro' })
  })

  test('limitado pela nave', () => {
    const [r] = routes([buy8(), sell12()], input({ shipScu: 100 }))
    expect(r).toMatchObject({ qty: 100, limitedBy: 'nave' })
  })

  test('limitado pela demanda', () => {
    const [r] = routes([buy8(), sell12({ scu_sell: 300 })], input())
    expect(r).toMatchObject({ qty: 300, limitedBy: 'demanda', demandKnown: true })
  })

  test('demanda desconhecida não limita', () => {
    const [r] = routes([buy8(), sell12({ scu_sell: 0, scu_sell_avg: 0 })], input())
    expect(r).toMatchObject({ qty: 434, limitedBy: 'estoque', demandKnown: false })
  })

  test('estoque desconhecido não limita', () => {
    const [r] = routes([buy8({ scu_buy: 0, scu_buy_avg: 0 }), sell12()], input({ budget: 1_000_000 }))
    expect(r).toMatchObject({ qty: 141, limitedBy: 'dinheiro', stockKnown: false })
  })

  test('usa scu_buy_avg quando scu_buy é 0', () => {
    const [r] = routes([buy8({ scu_buy: 0, scu_buy_avg: 50 }), sell12()], input())
    expect(r).toMatchObject({ qty: 50, limitedBy: 'estoque', stockKnown: true })
  })

  test('usa scu_sell_avg quando scu_sell é 0', () => {
    const [r] = routes([buy8(), sell12({ scu_sell: 0, scu_sell_avg: 200 })], input())
    expect(r).toMatchObject({ qty: 200, limitedBy: 'demanda' })
  })

  test('exclui ilegais quando pedido', () => {
    const slam = commodity(70, 'SLAM', { is_illegal: 1 })
    const prices = [price(70, 8, { price_buy: 100, scu_buy: 10 }), price(70, 12, { price_sell: 500, scu_sell: 10 })]
    expect(routes(prices, input(), [slam])).toEqual([])
    expect(routes(prices, input({ excludeIllegal: false }), [slam])).toHaveLength(1)
  })

  test('ignora compra e venda no mesmo terminal', () => {
    const prices = [price(47, 8, { price_buy: 7047, scu_buy: 434, price_sell: 8500, scu_sell: 100 })]
    expect(routes(prices, input())).toEqual([])
  })

  test('ignora lucro zero ou negativo', () => {
    expect(routes([buy8(), sell12({ price_sell: 7047 })], input())).toEqual([])
    expect(routes([buy8(), sell12({ price_sell: 6000 })], input())).toEqual([])
  })

  test('ordena por lucro e por roi', () => {
    const gold = commodity(30, 'Gold')
    const prices = [
      buy8(), sell12(), // lucro 630.602, roi ~20,6%
      price(30, 8, { price_buy: 100, scu_buy: 100 }), price(30, 12, { price_sell: 200, scu_sell: 100 }), // lucro 10.000, roi 100%
    ]
    expect(routes(prices, input(), [laranite, gold]).map((r) => r.commodityName)).toEqual(['Laranite', 'Gold'])
    expect(routes(prices, input({ sortBy: 'roi' }), [laranite, gold]).map((r) => r.commodityName)).toEqual(['Gold', 'Laranite'])
  })

  test('filtra sistema de origem', () => {
    const prices = [buy8(), sell12(), price(47, 20, { price_buy: 7000, scu_buy: 10 }), price(47, 21, { price_sell: 9000, scu_sell: 10 })]
    const rs = routes(prices, input({ originSystem: 'Pyro' }))
    expect(rs.every((r) => r.buy.id_terminal === 20)).toBe(true)
    expect(rs.length).toBeGreaterThan(0)
  })

  test('Evitar exclui rotas com compra ou venda no lugar evitado', () => {
    const prices = [buy8(), sell12(), price(47, 20, { price_buy: 7000, scu_buy: 10 }), price(47, 21, { price_sell: 9000, scu_sell: 10 })]
    const rs = routes(prices, input({ avoid: [{ system: 'Pyro' }] }))
    expect(rs.map((r) => [r.buy.id_terminal, r.sell.id_terminal])).toEqual([[8, 12]])
  })

  test('respeita o limite de resultados', () => {
    const prices = [buy8(), sell12(), price(47, 21, { price_sell: 9000, scu_sell: 10 })]
    const r = computeRoutes(prices, [laranite], terminals, input(), 1)
    expect(r.ok && r.routes).toHaveLength(1)
  })

  test('orçamento 0, negativo ou inválido', () => {
    for (const budget of [0, -5, NaN]) {
      expect(computeRoutes([buy8(), sell12()], [laranite], terminals, input({ budget }))).toEqual({ ok: false, reason: 'sem_orcamento' })
    }
  })

  test('nave sem carga', () => {
    expect(computeRoutes([buy8(), sell12()], [laranite], terminals, input({ shipScu: 0 }))).toEqual({ ok: false, reason: 'nave_sem_carga' })
  })
})

import { describe, expect, test } from 'vitest'
import { commodity, price, terminal } from '../test/fixtures'
import { bestPaths, greedyPaths, rankByDistance, rankRoundabouts, roundabouts, type TradePath } from './path'
import type { RouteInput, RouteOption } from './routes'

const X = commodity(1, 'X')
const Y = commodity(2, 'Y')
const Z = commodity(3, 'Z')
const W = commodity(4, 'W')
const terminals = new Map([1, 2, 3, 4].map((id) => [id, terminal(id)]))
const input = (extra: Partial<RouteInput> = {}): RouteInput => ({ shipScu: 1000, budget: 1_000_000, excludeIllegal: true, sortBy: 'profit', ...extra })
const hops = (legs: RouteOption[]) => legs.map((l) => `${l.commodityName}:${l.buy.id_terminal}>${l.sell.id_terminal}`)

// De 1: X vai a 2 (lucro pequeno, mas de 2 sai Z muito lucrativo); Y vai a 3 (lucro maior, mas 3 é beco sem saída).
const chain = [
  price(1, 1, { price_buy: 100, scu_buy: 100 }),
  price(1, 2, { price_sell: 110, scu_sell: 1000 }),
  price(2, 1, { price_buy: 100, scu_buy: 100 }),
  price(2, 3, { price_sell: 150, scu_sell: 1000 }),
  price(3, 2, { price_buy: 100, scu_buy: 1000 }),
  price(3, 4, { price_sell: 400, scu_sell: 1000 }),
]

describe('bestPaths', () => {
  test('escolhe o maior lucro somado, não o melhor primeiro trecho', () => {
    const [best] = bestPaths(chain, [X, Y, Z], terminals, input(), { legs: 2, start: 1 })
    expect(hops(best.legs)).toEqual(['X:1>2', 'Z:2>4'])
    expect(best.total).toBe(1_000 + 300_000)
    expect(best.short).toBe(false)
  })

  test('o lucro de um trecho vira orçamento do próximo', () => {
    const prices = [
      price(1, 1, { price_buy: 100, scu_buy: 1000 }),
      price(1, 2, { price_sell: 200, scu_sell: 1000 }),
      price(3, 2, { price_buy: 100, scu_buy: 1000 }),
      price(3, 4, { price_sell: 400, scu_sell: 1000 }),
    ]
    const [best] = bestPaths(prices, [X, Z], terminals, input({ budget: 10_000 }), { legs: 2, start: 1 })
    expect(best.legs.map((l) => l.qty)).toEqual([100, 200])
  })

  test('sem saída no meio, o caminho termina antes e avisa', () => {
    const [best] = bestPaths(chain, [X, Y, Z], terminals, input(), { legs: 3, start: 1 })
    expect(best.legs).toHaveLength(2)
    expect(best.short).toBe(true)
  })

  test('sem "Começar em", caminhos alternativos começam por trechos diferentes', () => {
    const paths = bestPaths(chain, [X, Y, Z], terminals, input(), { legs: 2 })
    const firsts = paths.map((p) => hops(p.legs)[0])
    expect(new Set(firsts).size).toBe(firsts.length)
    expect(paths.length).toBeGreaterThan(1)
  })

  test('respeita Evitar em todos os trechos', () => {
    const [best] = bestPaths(chain, [X, Y, Z], new Map([...terminals, [4, terminal(4, { star_system_name: 'Pyro' })]]), input({ avoid: [{ system: 'Pyro' }] }), { legs: 2, start: 1 })
    expect(hops(best.legs)).not.toContain('Z:2>4')
  })
})

describe('roundabouts', () => {
  const pingPong = [
    price(1, 1, { price_buy: 100, scu_buy: 150 }),
    price(1, 2, { price_sell: 200, scu_sell: 1000 }),
    price(2, 2, { price_buy: 100, scu_buy: 1000 }),
    price(2, 1, { price_sell: 150, scu_sell: 1000 }),
    // W só tem ida (1 → 3): não forma rotativo
    price(4, 1, { price_buy: 10, scu_buy: 1000 }),
    price(4, 3, { price_sell: 9000, scu_sell: 1000 }),
  ]

  test('vai e volta descontando o estoque usado, até acabar', () => {
    const [r] = roundabouts(pingPong, [X, Y, W], terminals, input({ shipScu: 100 }), { start: 1 })
    expect(hops(r.legs)).toEqual(['X:1>2', 'Y:2>1', 'X:1>2', 'Y:2>1'])
    expect(r.legs.map((l) => l.qty)).toEqual([100, 100, 50, 100])
    expect(r.capped).toBe(false)
  })

  test('par sem volta lucrativa não entra', () => {
    const all = roundabouts(pingPong, [X, Y, W], terminals, input({ shipScu: 100 }), {})
    expect(all.every((r) => r.legs.every((l) => l.commodityName !== 'W'))).toBe(true)
  })

  test('estoque desconhecido para no teto de 10 trechos e avisa', () => {
    const unknown = pingPong.map((p) => ({ ...p, scu_buy: 0, scu_buy_avg: 0, scu_sell: 0, scu_sell_avg: 0 }))
    const [r] = roundabouts(unknown, [X, Y], terminals, input({ shipScu: 100 }), { start: 1 })
    expect(r.legs).toHaveLength(10)
    expect(r.capped).toBe(true)
  })
})

describe('distâncias', () => {
  const twoWays = [
    price(1, 1, { price_buy: 100, scu_buy: 100 }),
    price(1, 2, { price_sell: 110, scu_sell: 1000 }), // lucro 1.000 em 1 Gm
    price(2, 1, { price_buy: 100, scu_buy: 100 }),
    price(2, 3, { price_sell: 150, scu_sell: 1000 }), // lucro 5.000 em 100 Gm
  ]
  const dist: Record<string, number> = { '1:2': 1, '1:3': 100 }

  test('rankByDistance ordena por lucro por Gm; sem distância vai ao fim; 0 Gm conta como 1', () => {
    const routes = [
      { profit: 5000, buy: { id_terminal: 1 }, sell: { id_terminal: 3 } },
      { profit: 1000, buy: { id_terminal: 1 }, sell: { id_terminal: 2 } },
      { profit: 9000, buy: { id_terminal: 1 }, sell: { id_terminal: 4 } },
      { profit: 800, buy: { id_terminal: 2 }, sell: { id_terminal: 3 } },
    ] as RouteOption[]
    const d = (a: number, b: number) => ({ '1:3': 100, '1:2': 1, '2:3': 0 } as Record<string, number>)[`${a}:${b}`]
    expect(rankByDistance(routes, d).map((r) => r.profit)).toEqual([1000, 800, 5000, 9000])
  })

  test('greedyPaths pede as distâncias que faltam e depois escolhe por lucro por Gm', () => {
    const first = greedyPaths(twoWays, [X, Y], terminals, input(), { legs: 1, start: 1 }, () => undefined)
    expect(first.pending.map(([a, b]) => `${a}:${b}`).sort()).toEqual(['1:2', '1:3'])
    const done = greedyPaths(twoWays, [X, Y], terminals, input(), { legs: 1, start: 1 }, (a, b) => dist[`${a}:${b}`])
    expect(done.pending).toEqual([])
    expect(hops(done.paths[0].legs)).toEqual(['X:1>2'])
  })
})

describe('rankRoundabouts', () => {
  test('lucro total por (distância × trechos); sem distância vai ao fim', () => {
    const rb = (a: number, b: number, total: number, n: number) =>
      ({ total, short: false, legs: Array.from({ length: n }, () => ({ buy: { id_terminal: a }, sell: { id_terminal: b } })) }) as unknown as TradePath
    const list = [rb(1, 2, 100_000, 4), rb(1, 3, 60_000, 2), rb(1, 4, 900_000, 4)]
    const d = (a: number, b: number) => ({ '1:2': 50, '1:3': 10 } as Record<string, number>)[`${a}:${b}`]
    expect(rankRoundabouts(list, d).map((p) => p.total)).toEqual([60_000, 100_000, 900_000])
  })
})

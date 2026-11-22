import { describe, expect, test } from 'vitest'
import { PRICES, terminal } from '../test/fixtures'
import type { Commodity, Terminal } from '../data/types'
import { computeRoutes, routeFilters, type RouteInput } from './routes'
import { bestPaths, roundabouts } from './path'

const laranite = { id: 47, name: 'Laranite', is_illegal: 0 } as Commodity
const input = (extra: Partial<RouteInput> = {}): RouteInput => ({ shipScu: 576, budget: 5_000_000, excludeIllegal: true, sortBy: 'profit', ...extra })

const map = (dock: number[]) => new Map<number, Terminal>([8, 12, 13].map((id) => [id, terminal(id, { has_loading_dock: dock.includes(id) ? 1 : 0 })]))

const sells = (dock: number[], extra: Partial<RouteInput> = {}) => {
  const r = computeRoutes(PRICES, [laranite], map(dock), input(extra))
  if (!r.ok) throw new Error(r.reason)
  return r.routes.map((x) => `${x.buy.id_terminal}>${x.sell.id_terminal}`)
}

describe('doca de carga externa', () => {
  test('sem dockOnly, todas as rotas valem', () => {
    expect(sells([]).sort()).toEqual(['8>12', '8>13'])
  })

  test('com dockOnly, compra e venda precisam ter doca', () => {
    expect(sells([13], { dockOnly: true })).toEqual([])
    expect(sells([8, 13], { dockOnly: true })).toEqual(['8>13'])
    expect(sells([8, 12, 13], { dockOnly: true }).sort()).toEqual(['8>12', '8>13'])
  })

  test('terminal desconhecido conta como sem doca', () => {
    const f = routeFilters([laranite], new Map(), input({ dockOnly: true }))
    expect(f.avoided(99)).toBe(true)
    expect(routeFilters([laranite], new Map(), input()).avoided(99)).toBe(false)
  })

  test('CAMINHO e ROTATIVO respeitam a doca', () => {
    const m = map([8, 13])
    expect(bestPaths(PRICES, [laranite], m, input(), { legs: 2, start: null }).flatMap((p) => p.legs).some((l) => l.sell.id_terminal === 12)).toBe(true)
    expect(bestPaths(PRICES, [laranite], m, input({ dockOnly: true }), { legs: 2, start: null }).length).toBeGreaterThan(0)
    for (const p of bestPaths(PRICES, [laranite], m, input({ dockOnly: true }), { legs: 2, start: null }))
      for (const l of p.legs) expect([l.buy.id_terminal, l.sell.id_terminal].every((id) => id !== 12)).toBe(true)
    for (const p of roundabouts(PRICES, [laranite], m, input({ dockOnly: true }), { start: null, count: 3 }))
      for (const l of p.legs) expect([l.buy.id_terminal, l.sell.id_terminal].every((id) => id !== 12)).toBe(true)
  })
})

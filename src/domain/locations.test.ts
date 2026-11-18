import { describe, expect, test } from 'vitest'
import type { Commodity, Moon, Planet, Terminal } from '../data/types'
import { buildLocationTree, whereFound } from './locations'

function t(id: number, extra: Partial<Terminal>): Terminal {
  return {
    id, name: `T${id}`, displayname: `T${id}`, type: 'commodity', star_system_name: 'Stanton', planet_name: null,
    moon_name: null, space_station_name: null, city_name: null, outpost_name: null, ...extra,
  }
}

const terminals: Terminal[] = [
  t(1, { planet_name: 'Hurston', city_name: 'Lorville', displayname: 'Lorville CBD' }),
  t(2, { planet_name: 'Hurston', moon_name: 'Aberdeen', outpost_name: 'HDMS-Anderson' }),
  t(3, { planet_name: 'Hurston', displayname: 'Direto no planeta' }),
  t(4, { star_system_name: 'Pyro', planet_name: null, space_station_name: 'Ruin Station' }),
  t(5, { planet_name: 'Hurston', type: 'item' }),
]

describe('buildLocationTree', () => {
  const tree = buildLocationTree(terminals)

  test('nível 1 são os sistemas em ordem alfabética', () => {
    expect(tree.map((n) => n.label)).toEqual(['Pyro', 'Stanton'])
  })

  test('terminal sem planeta vai para Espaço profundo', () => {
    const pyro = tree[0]
    expect(pyro.children[0].label).toBe('Espaço profundo')
    expect(pyro.children[0].children[0].label).toBe('Ruin Station')
  })

  test('terminal em lua fica sob a lua; sem lugar fica direto no planeta', () => {
    const hurston = tree[1].children.find((n) => n.label === 'Hurston')!
    expect(hurston.children.map((n) => n.label)).toEqual(['Aberdeen', 'Lorville'])
    expect(hurston.children[0].terminals.map((x) => x.id)).toEqual([2])
    expect(hurston.terminals.map((x) => x.id)).toEqual([3])
  })

  test('filtra por tipo de terminal', () => {
    const all = JSON.stringify(tree)
    expect(all).not.toContain('"id":5')
  })
})

describe('whereFound', () => {
  const planets = new Map<number, Planet>([[4, { id: 4, name: 'Hurston' }], [242, { id: 242, name: 'Pyro I' }]])
  const moons = new Map<number, Moon>([[1, { id: 1, name: 'Aberdeen' }], [2, { id: 2, name: 'Arial' }]])
  const c = (ids_planets: string | null, ids_moons: string | null) => ({ ids_planets, ids_moons }) as Commodity

  test('nomes de planetas e luas, ordenados', () => {
    expect(whereFound(c('4,242', '1,2'), planets, moons)).toEqual(['Aberdeen', 'Arial', 'Hurston', 'Pyro I'])
  })
  test('null e vazio → lista vazia', () => {
    expect(whereFound(c(null, ''), planets, moons)).toEqual([])
  })
  test('ID desconhecido é ignorado', () => {
    expect(whereFound(c('4,999', null), planets, moons)).toEqual(['Hurston'])
  })
})

import { describe, expect, test } from 'vitest'
import { terminal } from '../test/fixtures'
import { avoidKey, avoidLabel, avoidMatch, avoidOptions, placeOf } from './avoid'

const grimhex = terminal(1, { star_system_name: 'Stanton', planet_name: 'Crusader', moon_name: 'Yela', space_station_name: 'Green Imperial Housing Exchange' })
const cru = terminal(2, { star_system_name: 'Stanton', planet_name: 'Crusader', space_station_name: 'CRU-L1 Ambitious Dream Station' })
const daymar = terminal(3, { star_system_name: 'Stanton', planet_name: 'Crusader', moon_name: 'Daymar', outpost_name: 'Kudre Ore' })
const lorville = terminal(4, { star_system_name: 'Stanton', planet_name: 'Hurston', city_name: 'Lorville' })
const nyx = terminal(5, { star_system_name: 'Nyx', planet_name: null, space_station_name: 'Levski' })
const fakePyro = terminal(6, { star_system_name: 'Pyro', planet_name: 'Crusader' })

describe('placeOf', () => {
  test('lua vem antes da estação', () => expect(placeOf(grimhex)).toBe('Yela'))
  test('estação, cidade, nada', () => {
    expect(placeOf(cru)).toBe('CRU-L1 Ambitious Dream Station')
    expect(placeOf(lorville)).toBe('Lorville')
    expect(placeOf(terminal(9, { planet_name: 'Hurston' }))).toBeNull()
  })
})

describe('avoidMatch', () => {
  test('sistema', () => {
    expect(avoidMatch(nyx, [{ system: 'Nyx' }])).toBe(true)
    expect(avoidMatch(lorville, [{ system: 'Nyx' }])).toBe(false)
  })
  test('planeta pega luas e estações em volta, só no mesmo sistema', () => {
    const avoid = [{ system: 'Stanton', planet: 'Crusader' }]
    expect(avoidMatch(grimhex, avoid)).toBe(true)
    expect(avoidMatch(cru, avoid)).toBe(true)
    expect(avoidMatch(lorville, avoid)).toBe(false)
    expect(avoidMatch(fakePyro, avoid)).toBe(false)
  })
  test('lugar', () => {
    const avoid = [{ system: 'Stanton', planet: 'Crusader', place: 'Yela' }]
    expect(avoidMatch(grimhex, avoid)).toBe(true)
    expect(avoidMatch(daymar, avoid)).toBe(false)
  })
  test('terminal desconhecido ou lista vazia nunca exclui', () => {
    expect(avoidMatch(undefined, [{ system: 'Nyx' }])).toBe(false)
    expect(avoidMatch(nyx, [])).toBe(false)
  })
  test('espaço profundo só casa com o sistema', () => {
    expect(avoidMatch(nyx, [{ system: 'Nyx', planet: 'Levski' }])).toBe(false)
  })
})

describe('avoidOptions', () => {
  test('sistemas, planetas e lugares únicos, só de terminais de commodity', () => {
    const opts = avoidOptions([grimhex, cru, daymar, lorville, nyx, grimhex, terminal(7, { type: 'item', star_system_name: 'Pyro', planet_name: 'Pyro I' })])
    expect(opts.map(avoidKey)).toEqual([
      'Nyx//',
      'Stanton//',
      'Stanton/Crusader/',
      'Stanton/Crusader/CRU-L1 Ambitious Dream Station',
      'Stanton/Crusader/Daymar',
      'Stanton/Crusader/Yela',
      'Stanton/Hurston/',
      'Stanton/Hurston/Lorville',
    ])
  })
  test('rótulo é o nível mais fundo', () => {
    expect(avoidLabel({ system: 'Stanton' })).toBe('Stanton')
    expect(avoidLabel({ system: 'Stanton', planet: 'Crusader', place: 'Yela' })).toBe('Yela')
  })
})

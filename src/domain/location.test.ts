import { describe, expect, test } from 'vitest'
import { terminal } from '../test/fixtures'
import { locationPath, placeName } from './location'

const station = terminal(1, { star_system_name: 'Stanton', planet_name: 'ArcCorp', moon_name: null, space_station_name: 'ARC-L1 Wide Forest Station' })
const outpost = terminal(2, { star_system_name: 'Stanton', planet_name: 'Hurston', moon_name: 'Aberdeen', outpost_name: 'HDMS-Anderson' })
const city = terminal(3, { star_system_name: 'Stanton', planet_name: 'Hurston', city_name: 'Lorville' })
const deep = terminal(4, { star_system_name: 'Pyro', planet_name: null })

describe('locationPath', () => {
  test('estação de Lagrange sem lua', () => expect(locationPath(station)).toEqual(['Stanton', 'ArcCorp', 'ARC-L1 Wide Forest Station']))
  test('posto numa lua', () => expect(locationPath(outpost)).toEqual(['Stanton', 'Hurston', 'Aberdeen', 'HDMS-Anderson']))
  test('cidade', () => expect(locationPath(city)).toEqual(['Stanton', 'Hurston', 'Lorville']))
  test('só sistema', () => expect(locationPath(deep)).toEqual(['Pyro']))
  test('nomes repetidos em sequência aparecem uma vez', () =>
    expect(locationPath(terminal(5, { planet_name: 'Pyro I', moon_name: 'Pyro I' }))).toEqual(['Stanton', 'Pyro I']))
})

describe('placeName', () => {
  test('estação', () => expect(placeName(station)).toBe('ARC-L1 Wide Forest Station'))
  test('posto', () => expect(placeName(outpost)).toBe('HDMS-Anderson'))
  test('só planeta', () => expect(placeName(terminal(6, { planet_name: 'Hurston' }))).toBe('Hurston'))
})

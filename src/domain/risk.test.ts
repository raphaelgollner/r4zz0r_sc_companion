import { describe, expect, test } from 'vitest'
import { terminal } from '../test/fixtures'
import { riskAllowed, riskOf } from './risk'

const uee = 'United Empire of Earth'

describe('riskOf', () => {
  test('UEE em Stanton: cidade e estação são seguras; posto é mediano', () => {
    expect(riskOf(terminal(1, { faction_name: uee, city_name: 'Lorville' }))).toBe('safe')
    expect(riskOf(terminal(2, { faction_name: uee, space_station_name: 'Everus Harbor' }))).toBe('safe')
    expect(riskOf(terminal(3, { faction_name: uee, moon_name: 'Daymar', outpost_name: 'Kudre Ore' }))).toBe('medium')
  })
  test('UEE fora de Stanton é mediano', () => {
    expect(riskOf(terminal(4, { faction_name: uee, star_system_name: 'Pyro', space_station_name: 'Pyro Gateway' }))).toBe('medium')
  })
  test('facções hostis são perigosas', () => {
    for (const f of ['Nine Tails', 'Headhunters', 'XenoThreat', 'Dusters', 'Rough & Ready'])
      expect(riskOf(terminal(5, { faction_name: f, star_system_name: 'Pyro' }))).toBe('dangerous')
  })
  test('CFP e People’s Alliance são arriscados', () => {
    expect(riskOf(terminal(6, { faction_name: 'Citizens For Prosperity', star_system_name: 'Pyro' }))).toBe('risky')
    expect(riskOf(terminal(7, { faction_name: "People's Alliance", star_system_name: 'Nyx' }))).toBe('risky')
  })
  test('sem facção depende do sistema', () => {
    expect(riskOf(terminal(8, { faction_name: null }))).toBe('medium')
    expect(riskOf(terminal(9, { faction_name: null, star_system_name: 'Nyx' }))).toBe('risky')
    expect(riskOf(terminal(10, { faction_name: null, star_system_name: 'Pyro' }))).toBe('dangerous')
  })
  test('terminal desconhecido não tem nível', () => expect(riskOf(undefined)).toBeNull())
  test('sem facção e sem sistema não tem nível', () => expect(riskOf(terminal(11, { faction_name: null, star_system_name: null }))).toBeNull())
})

describe('riskAllowed', () => {
  test('compara com o máximo aceito; desconhecido sempre passa', () => {
    expect(riskAllowed('risky', 'medium')).toBe(false)
    expect(riskAllowed('medium', 'medium')).toBe(true)
    expect(riskAllowed('dangerous', 'any')).toBe(true)
    expect(riskAllowed(null, 'safe')).toBe(true)
  })
})

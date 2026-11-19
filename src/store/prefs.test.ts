import { beforeEach, describe, expect, test } from 'vitest'
import { DEFAULT_PREFS, effectiveScu, loadPrefs, savePrefs } from './prefs'

describe('prefs', () => {
  beforeEach(() => localStorage.clear())

  test('sem nada salvo devolve o padrão', () => {
    expect(loadPrefs()).toEqual(DEFAULT_PREFS)
    expect(DEFAULT_PREFS).toEqual({
      shipId: null, budget: 0, excludeIllegal: true, originSystem: '', sortBy: 'profit', warnHours: 24, staleDays: 7, scuOverrides: {}, avoid: [], maxRisk: 'any', routeMode: 'list', shortDistances: false, pathStart: null, pathLegs: 4,
    })
  })

  test('salva e lê', () => {
    savePrefs({ ...DEFAULT_PREFS, shipId: 5, budget: 5_000_000 })
    expect(loadPrefs()).toMatchObject({ shipId: 5, budget: 5_000_000 })
  })

  test('JSON corrompido volta ao padrão', () => {
    localStorage.setItem('tayko.prefs', '{quebrado')
    expect(loadPrefs()).toEqual(DEFAULT_PREFS)
  })

  test('campos faltando são completados com o padrão', () => {
    localStorage.setItem('tayko.prefs', JSON.stringify({ budget: 10 }))
    expect(loadPrefs()).toEqual({ ...DEFAULT_PREFS, budget: 10 })
  })
})

describe('prefs.avoid', () => {
  beforeEach(() => localStorage.clear())
  test('salvo malformado vira lista vazia', () => {
    localStorage.setItem('tayko.prefs', JSON.stringify({ avoid: 'x' }))
    expect(loadPrefs().avoid).toEqual([])
  })
  test('descarta itens sem sistema e guarda os válidos', () => {
    localStorage.setItem('tayko.prefs', JSON.stringify({ avoid: [{ system: 'Nyx' }, { planet: 'X' }, null, { system: 'Stanton', planet: 'Crusader' }] }))
    expect(loadPrefs().avoid).toEqual([{ system: 'Nyx' }, { system: 'Stanton', planet: 'Crusader' }])
  })
})

describe('effectiveScu', () => {
  const galaxy = { id: 7, name: 'Galaxy', name_full: 'RSI Galaxy', scu: 64, is_cargo: 1, is_mining: 0, is_salvage: 0, is_ground_vehicle: 0 }
  test('sem override usa o SCU do UEX', () => expect(effectiveScu(DEFAULT_PREFS, galaxy)).toBe(64))
  test('com override usa o valor digitado', () => expect(effectiveScu({ ...DEFAULT_PREFS, scuOverrides: { 7: 192 } }, galaxy)).toBe(192))
  test('sem nave é 0', () => expect(effectiveScu(DEFAULT_PREFS, null)).toBe(0))
  test('padrão tem scuOverrides vazio', () => expect(DEFAULT_PREFS.scuOverrides).toEqual({}))
})

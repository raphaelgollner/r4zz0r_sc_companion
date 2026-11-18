import { beforeEach, describe, expect, test } from 'vitest'
import { DEFAULT_PREFS, loadPrefs, savePrefs } from './prefs'

describe('prefs', () => {
  beforeEach(() => localStorage.clear())

  test('sem nada salvo devolve o padrão', () => {
    expect(loadPrefs()).toEqual(DEFAULT_PREFS)
    expect(DEFAULT_PREFS).toEqual({
      shipId: null, budget: 0, excludeIllegal: true, originSystem: '', sortBy: 'profit', warnHours: 24, staleDays: 7,
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

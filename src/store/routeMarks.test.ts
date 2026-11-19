import { beforeEach, describe, expect, test } from 'vitest'
import { loadRouteMarks, resetRouteMarksForTest, setRouteMark } from './routeMarks'

const rec = { marks: ['hidden' as const], buyAt: 1, sellAt: 2, commodityName: 'Q', buyName: 'a', sellName: 'b' }

describe('routeMarks store', () => {
  beforeEach(() => {
    localStorage.clear()
    resetRouteMarksForTest()
  })

  test('grava, lê de volta e remove', () => {
    setRouteMark('1:2:3', rec)
    expect(loadRouteMarks()).toEqual({ '1:2:3': rec })
    setRouteMark('1:2:3', undefined)
    expect(loadRouteMarks()).toEqual({})
  })

  test('dado malformado vira vazio; registros sem marcas válidas são descartados', () => {
    localStorage.setItem('tayko.routeMarks', '"x"')
    expect(loadRouteMarks()).toEqual({})
    localStorage.setItem('tayko.routeMarks', JSON.stringify({ a: rec, b: { marks: 'x' }, c: { ...rec, marks: ['nope'] } }))
    expect(loadRouteMarks()).toEqual({ a: rec })
  })
})

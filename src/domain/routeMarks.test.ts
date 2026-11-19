import { describe, expect, test } from 'vitest'
import { activeMarks, routeKey, toggleMark, type MarkRecord } from './routeMarks'

const route = {
  commodityId: 47,
  commodityName: 'Quartz',
  buy: { id_terminal: 8, date_modified: 100, terminal_name: 'Shubin SAL-2' },
  sell: { id_terminal: 12, date_modified: 200, terminal_name: 'MIC-L5' },
}

describe('routeKey', () => {
  test('mercadoria:compra:venda', () => expect(routeKey(route)).toBe('47:8:12'))
})

describe('toggleMark', () => {
  test('marca guarda datas e nomes; desmarcar tudo apaga o registro', () => {
    const rec = toggleMark(undefined, 'lowStock', route)!
    expect(rec).toEqual({ marks: ['lowStock'], buyAt: 100, sellAt: 200, commodityName: 'Quartz', buyName: 'Shubin SAL-2', sellName: 'MIC-L5' })
    const two = toggleMark(rec, 'hidden', route)!
    expect(two.marks).toEqual(['lowStock', 'hidden'])
    expect(toggleMark(toggleMark(two, 'lowStock', route), 'hidden', route)).toBeUndefined()
  })

  test('marcar de novo com preço novo atualiza as datas e descarta as que expiraram', () => {
    const old: MarkRecord = { marks: ['done', 'danger'], buyAt: 50, sellAt: 200, commodityName: 'Quartz', buyName: 'a', sellName: 'b' }
    const rec = toggleMark(old, 'priceOff', route)!
    expect(rec.marks).toEqual(['danger', 'priceOff'])
    expect(rec.buyAt).toBe(100)
  })
})

describe('activeMarks', () => {
  const rec: MarkRecord = { marks: ['done', 'lowStock', 'noDemand', 'priceOff', 'danger', 'hidden'], buyAt: 100, sellAt: 200, commodityName: 'Q', buyName: 'a', sellName: 'b' }
  test('sem dado novo, todas valem', () => expect(activeMarks(rec, 100, 200)).toEqual(rec.marks))
  test('compra com dado novo: só as fixas ficam', () => expect(activeMarks(rec, 101, 200)).toEqual(['danger', 'hidden']))
  test('venda com dado novo: só as fixas ficam', () => expect(activeMarks(rec, 100, 201)).toEqual(['danger', 'hidden']))
  test('sem registro, nada', () => expect(activeMarks(undefined, 1, 1)).toEqual([]))
})

import { describe, expect, test } from 'vitest'
import type { ItemAttribute, RawPriceRow, RefineryYield } from '../data/types'
import { commodity, price } from '../test/fixtures'
import { attr, distancesFor, oreSummary, refinedOf, refinePlan, refineryMatrix, sellRawValue } from './mining'

const laraniteRaw = commodity(48, 'Laranite (Raw)', { is_raw: 1, is_refined: 0 })
const laranite = commodity(47, 'Laranite')
const quantRaw = commodity(59, 'Quantainium (Raw)', { is_raw: 1, is_refined: 0 })
const quant = commodity(58, 'Quantainium')
const iceRaw = commodity(90, 'Ice (Raw)', { is_raw: 1, is_refined: 0 })
const all = [laraniteRaw, laranite, quantRaw, quant, iceRaw]

const raw = (id_commodity: number, id_terminal: number, price_sell: number): RawPriceRow => ({
  id: id_commodity * 100 + id_terminal, id_commodity, id_terminal, price_sell, date_modified: 1, commodity_name: '', terminal_name: `T${id_terminal}`,
})
const y = (id_commodity: number, id_terminal: number, value: number, terminal_name = `R${id_terminal}`): RefineryYield => ({
  id_commodity, id_terminal, value, terminal_name, commodity_name: '', date_modified: 1,
})

describe('refinedOf', () => {
  test('tira o sufixo (Raw)/(Ore)', () => expect(refinedOf(laraniteRaw, all)?.id).toBe(47))
  test('sem commodity refinada → null', () => expect(refinedOf(iceRaw, all)).toBeNull())
})

describe('oreSummary', () => {
  test('ganho ao refinar em %', () => {
    const rows = oreSummary([laraniteRaw], all, [raw(48, 1, 3000), raw(48, 2, 2500)], [price(47, 12, { price_sell: 8700 })])
    expect(rows[0].bestRaw?.price_sell).toBe(3000)
    expect(rows[0].bestRefined?.price_sell).toBe(8700)
    expect(rows[0].uplift).toBeCloseTo(190, 5)
  })
  test('sem preço bruto → uplift null', () => {
    expect(oreSummary([laraniteRaw], all, [], [price(47, 12, { price_sell: 8700 })])[0].uplift).toBeNull()
  })
})

describe('refineryMatrix', () => {
  test('refinarias e minérios únicos, valor por par', () => {
    const m = refineryMatrix([y(59, 1, 5, 'A'), y(48, 1, -2, 'A'), y(59, 2, 3, 'B')])
    expect(m.terminals.map((x) => x.name)).toEqual(['A', 'B'])
    expect(m.value(1, 48)).toBe(-2)
    expect(m.value(2, 48)).toBeNull()
  })
})

describe('refinePlan', () => {
  const yields = [y(59, 1, 5, 'A'), y(48, 1, -2, 'A')]
  const refineries = [{ id: 1, name: 'A' }, { id: 2, name: 'B' }]
  const refinedPrice = (oreId: number) => (oreId === 59 ? 148409 : oreId === 48 ? 8600 : null)
  const cargo = [{ oreId: 59, scu: 12 }, { oreId: 48, scu: 8 }]

  test('valor estimado e bônus médio ponderado', () => {
    const rows = refinePlan(cargo, yields, refinedPrice, () => null, refineries, 'value')
    expect(rows.map((r) => r.terminalName)).toEqual(['A', 'B'])
    expect(rows[0].estValue).toBeCloseTo(1_937_377.4, 1)
    expect(rows[0].avgBonus).toBeCloseTo(2.2, 5)
    expect(rows[1].estValue).toBeCloseTo(1_849_708, 1)
    expect(rows[1].avgBonus).toBe(0)
  })

  test('por distância: sem distância vai por último', () => {
    const rows = refinePlan(cargo, yields, refinedPrice, (id) => (id === 1 ? 120 : null), refineries, 'distance')
    expect(rows.map((r) => [r.terminalName, r.distance])).toEqual([['A', 120], ['B', null]])
  })

  test('carga vazia ou com SCU inválido → nada', () => {
    expect(refinePlan([{ oreId: 59, scu: 0 }, { oreId: 48, scu: NaN }], yields, refinedPrice, () => null, refineries, 'value')).toEqual([])
    expect(refinePlan([], yields, refinedPrice, () => null, refineries, 'value')).toEqual([])
  })

  test('minério sem preço fica de fora do valor, sem NaN', () => {
    const rows = refinePlan([{ oreId: 59, scu: 10 }, { oreId: 90, scu: 5 }], yields, refinedPrice, () => null, refineries, 'value')
    expect(rows[0].missingPrice).toEqual([90])
    expect(Number.isFinite(rows[0].estValue)).toBe(true)
    expect(rows[0].estValue).toBeCloseTo(10 * 148409 * 1.05, 1)
  })
})

describe('sellRawValue', () => {
  test('soma SCU × melhor preço bruto, ignorando sem preço', () => {
    expect(sellRawValue([{ oreId: 59, scu: 12 }, { oreId: 90, scu: 3 }], (id) => (id === 59 ? 10_000 : null))).toBe(120_000)
  })
})

describe('attr', () => {
  const attrs: ItemAttribute[] = [
    { id_item: 107, attribute_name: 'Mining Laser Power', value: '1305-4350', unit: '' },
    { id_item: 107, attribute_name: 'Laser Instability', value: '-10', unit: '%' },
    { id_item: 107, attribute_name: 'Resistance', value: '', unit: '' },
  ]
  test('valor com unidade', () => {
    expect(attr(attrs, 107, 'Mining Laser Power')).toBe('1305-4350')
    expect(attr(attrs, 107, 'Laser Instability')).toBe('-10 %')
  })
  test('vazio ou ausente → null', () => {
    expect(attr(attrs, 107, 'Resistance')).toBeNull()
    expect(attr(attrs, 999, 'Resistance')).toBeNull()
  })
})

describe('carga sem minério escolhido', () => {
  test('linha com SCU mas sem minério é ignorada', () => {
    const rows = refinePlan([{ oreId: 0, scu: 10 }], [], () => 100, () => null, [{ id: 1, name: 'A' }], 'value')
    expect(rows).toEqual([])
  })
})

describe('distancesFor', () => {
  test('refinaria onde o jogador está tem distância 0', () => {
    const m = distancesFor(1, [1, 2], new Map([['1:2', 50]]))
    expect(m.get(1)).toBe(0)
    expect(m.get(2)).toBe(50)
  })
  test('sem local: vazio', () => expect(distancesFor(null, [1, 2], new Map()).size).toBe(0))
})

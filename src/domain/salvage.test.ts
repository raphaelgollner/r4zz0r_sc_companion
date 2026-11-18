import { describe, expect, test } from 'vitest'
import { commodity, price } from '../test/fixtures'
import { capacityWarning, salvageMaterials, salvagePlan } from './salvage'

const RMC = commodity(63, 'Recycled Material Composite', { code: 'RMC' })
const CMAT = commodity(19, 'Construction Materials', { code: 'CMAT' })
const SCRAP = commodity(67, 'Scrap', { code: 'SCRA' })
const WASTE = commodity(79, 'Waste', { code: 'WAST' })
const GOLD = commodity(30, 'Gold', { code: 'GOLD' })

describe('salvageMaterials', () => {
  test('pega RMC, CMAT, Scrap e Waste pelo código', () => {
    expect(salvageMaterials([GOLD, WASTE, RMC, SCRAP, CMAT]).map((c) => c.code)).toEqual(['RMC', 'CMAT', 'SCRA', 'WAST'])
  })
})

describe('salvagePlan', () => {
  const prices = [
    price(63, 1, { price_sell: 8000, scu_sell: 100, terminal_name: 'Both' }),
    price(19, 1, { price_sell: 11000, scu_sell: 100, terminal_name: 'Both' }),
    price(63, 2, { price_sell: 8500, scu_sell: 4, terminal_name: 'RmcOnly' }),
    price(30, 3, { price_sell: 99999, scu_sell: 100, terminal_name: 'GoldOnly' }),
  ]
  const cargo = [
    { commodityId: 63, scu: 10 },
    { commodityId: 19, scu: 5 },
  ]

  test('por valor, com o que cada terminal não compra', () => {
    const rows = salvagePlan(cargo, prices, () => null, 'value')
    expect(rows.map((r) => [r.terminalId, r.value, r.missing])).toEqual([
      [1, 10 * 8000 + 5 * 11000, []],
      [2, 10 * 8500, [19]],
    ])
  })

  test('demanda menor que a carga vira aviso', () => {
    const rows = salvagePlan(cargo, prices, () => null, 'value')
    expect(rows.find((r) => r.terminalId === 2)!.short).toEqual([63])
    expect(rows.find((r) => r.terminalId === 1)!.short).toEqual([])
  })

  test('por distância: sem distância por último', () => {
    const rows = salvagePlan(cargo, prices, (id) => (id === 2 ? 30 : null), 'distance')
    expect(rows.map((r) => r.terminalId)).toEqual([2, 1])
  })

  test('carga vazia ou inválida → nada', () => {
    expect(salvagePlan([{ commodityId: 63, scu: 0 }, { commodityId: 0, scu: 5 }], prices, () => null, 'value')).toEqual([])
  })
})

describe('capacityWarning', () => {
  test('carga acima da capacidade', () => {
    expect(capacityWarning([{ commodityId: 63, scu: 20 }], 12)).toBe(true)
    expect(capacityWarning([{ commodityId: 63, scu: 12 }], 12)).toBe(false)
    expect(capacityWarning([{ commodityId: 63, scu: 20 }], 0)).toBe(false)
  })
})

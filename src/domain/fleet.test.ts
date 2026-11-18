import { describe, expect, test } from 'vitest'
import type { PledgePrice, VehiclePrice } from '../data/types'
import { vehicle } from '../test/fixtures'
import { bestAuec, fleetTotals, shipFunctions, usdPrice, type FleetEntry } from './fleet'

const pledge = (id_vehicle: number, price: number, currency: string, date_modified = 1): PledgePrice => ({ id: id_vehicle * 10 + date_modified, id_vehicle, price, currency, date_modified })
const buy = (id_vehicle: number, id_terminal: number, price_buy: number): VehiclePrice => ({
  id: id_vehicle * 100 + id_terminal, id_vehicle, id_terminal, price_buy, date_modified: 1, vehicle_name: '', terminal_name: `T${id_terminal}`,
})
const entry = (id: string, vehicleId: number): FleetEntry => ({ id, vehicleId, nickname: '', note: '', addedAt: 0, setup: {} })

describe('usdPrice', () => {
  const prices = [pledge(1, 284, 'GBP', 5), pledge(1, 337, 'EUR-DE', 6), pledge(1, 300, 'USD', 1), pledge(1, 315, 'USD', 3)]
  test('ignora outras moedas e usa a linha USD mais recente', () => expect(usdPrice(1, prices)).toBe(315))
  test('sem USD → null', () => expect(usdPrice(1, [pledge(1, 284, 'GBP')])).toBeNull())
  test('preço zero não conta', () => expect(usdPrice(2, [pledge(2, 0, 'USD')])).toBeNull())
})

describe('bestAuec', () => {
  test('menor preço positivo', () => expect(bestAuec(1, [buy(1, 5, 0), buy(1, 6, 3_400_000), buy(1, 7, 3_297_600)])?.id_terminal).toBe(7))
  test('sem oferta → null', () => expect(bestAuec(1, [])).toBeNull())
})

describe('fleetTotals', () => {
  const vehicles = new Map([
    [1, vehicle(1, 'Prospector', 32, { is_mining: 1 })],
    [2, vehicle(2, 'Cutter', 4)],
  ])
  const prices = [pledge(1, 155, 'USD')]
  const purchases = [buy(1, 7, 3_297_600), buy(2, 8, 900_000)]
  test('soma só o que tem preço e conta o que falta', () => {
    const t = fleetTotals([entry('a', 1), entry('b', 1), entry('c', 2), entry('d', 9999)], vehicles, prices, purchases)
    expect(t).toEqual({ count: 3, usd: 310, auec: 3_297_600 * 2 + 900_000, missingUsd: 1, missingAuec: 0, unknown: 1 })
  })
})

describe('shipFunctions', () => {
  test('rótulos pelas flags', () => {
    expect(shipFunctions(vehicle(1, 'Vulture', 12, { is_salvage: 1, is_tractor_beam: 1 }))).toEqual(['cargo', 'salvage', 'tractor'])
    expect(shipFunctions(vehicle(2, 'ROC', 0, { is_mining: 1, is_ground_vehicle: 1 }))).toEqual(['mining', 'ground'])
  })
})

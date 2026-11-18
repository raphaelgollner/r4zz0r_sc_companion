import { describe, expect, test } from 'vitest'
import type { VehiclePrice, VehicleRent } from '../data/types'
import { vehicle } from '../test/fixtures'
import { searchShips, shipOffers, shipRoles } from './ships'

describe('shipRoles', () => {
  test('Caterpillar de carga', () => {
    expect(shipRoles(vehicle(1, 'Caterpillar', 576, { is_cargo: 1, is_military: 0 }))).toEqual(['cargo'])
  })
  test('military e bomber viram um só combate', () => {
    expect(shipRoles(vehicle(2, 'Eclipse', 0, { is_cargo: 0, is_military: 1, is_bomber: 1 }))).toEqual(['combat'])
  })
  test('várias funções na ordem definida', () => {
    expect(shipRoles(vehicle(3, 'Reclaimer', 420, { is_cargo: 1, is_salvage: 1, is_tractor_beam: 1 } as never))).toEqual(['cargo', 'salvage'])
  })
  test('science ou research viram ciência; veículo terrestre', () => {
    expect(shipRoles(vehicle(4, 'ROC', 0, { is_cargo: 0, is_ground_vehicle: 1, is_mining: 1 }))).toEqual(['mining', 'ground'])
    expect(shipRoles(vehicle(5, 'Terrapin', 0, { is_cargo: 0, is_research: 1 }))).toEqual(['science'])
  })
})

describe('shipOffers', () => {
  const buys: VehiclePrice[] = [
    { id: 1, id_vehicle: 41, id_terminal: 1, price_buy: 3_000_000, date_modified: 1, vehicle_name: 'Caterpillar', terminal_name: 'New Deal' },
    { id: 2, id_vehicle: 41, id_terminal: 2, price_buy: 2_800_000, date_modified: 1, vehicle_name: 'Caterpillar', terminal_name: 'Astro Armada' },
    { id: 3, id_vehicle: 41, id_terminal: 3, price_buy: 0, date_modified: 1, vehicle_name: 'Caterpillar', terminal_name: 'Zero' },
    { id: 4, id_vehicle: 99, id_terminal: 1, price_buy: 1, date_modified: 1, vehicle_name: 'Hawk', terminal_name: 'New Deal' },
  ]
  const rents: VehicleRent[] = [
    { id: 1, id_vehicle: 41, id_terminal: 5, price_rent: 90_000, date_modified: 1, vehicle_name: 'Caterpillar', terminal_name: 'Lorville' },
  ]

  test('ordena compra crescente, ignora 0 e outras naves', () => {
    const o = shipOffers(41, buys, rents)
    expect(o.buy.map((b) => b.terminal_name)).toEqual(['Astro Armada', 'New Deal'])
    expect(o.minBuy).toBe(2_800_000)
    expect(o.minRent).toBe(90_000)
  })
  test('sem oferta devolve null', () => {
    expect(shipOffers(7, buys, rents)).toEqual({ buy: [], rent: [], minBuy: null, minRent: null })
  })
})

describe('searchShips', () => {
  const ships = [
    vehicle(1, 'Caterpillar', 576, { name_full: 'Drake Caterpillar', company_name: 'Drake Interplanetary' } as never),
    vehicle(2, 'Prospector', 0, { name_full: 'MISC Prospector', company_name: 'Musashi Industrial', is_mining: 1, is_cargo: 0 } as never),
    vehicle(3, 'Cutlass Black', 46, { name_full: 'Drake Cutlass Black', company_name: 'Drake Interplanetary' } as never),
  ]
  test('acha pelo fabricante, sem diferenciar maiúsculas', () => {
    expect(searchShips(ships, 'drake').map((s) => s.id)).toEqual([1, 3])
  })
  test('filtra por tipo', () => {
    expect(searchShips(ships, '', 'mining').map((s) => s.id)).toEqual([2])
  })
  test('busca vazia devolve todas', () => {
    expect(searchShips(ships, '  ')).toHaveLength(3)
  })
})

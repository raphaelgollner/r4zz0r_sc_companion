import type { Vehicle, VehiclePrice, VehicleRent } from '../data/types'

export type ShipRole =
  | 'cargo' | 'mining' | 'salvage' | 'ground' | 'combat' | 'exploration' | 'passenger' | 'racing'
  | 'refinery' | 'refuel' | 'repair' | 'medical' | 'science' | 'stealth' | 'starter' | 'construction'
  | 'datarunner' | 'interdiction' | 'carrier'

const RULES: [ShipRole, (v: Vehicle) => unknown][] = [
  ['cargo', (v) => v.is_cargo],
  ['mining', (v) => v.is_mining],
  ['salvage', (v) => v.is_salvage],
  ['ground', (v) => v.is_ground_vehicle],
  ['combat', (v) => v.is_military || v.is_bomber],
  ['exploration', (v) => v.is_exploration],
  ['passenger', (v) => v.is_passenger],
  ['racing', (v) => v.is_racing],
  ['refinery', (v) => v.is_refinery],
  ['refuel', (v) => v.is_refuel],
  ['repair', (v) => v.is_repair],
  ['medical', (v) => v.is_medical],
  ['science', (v) => v.is_science || v.is_research],
  ['stealth', (v) => v.is_stealth],
  ['starter', (v) => v.is_starter],
  ['construction', (v) => v.is_construction],
  ['datarunner', (v) => v.is_datarunner],
  ['interdiction', (v) => v.is_interdiction],
  ['carrier', (v) => v.is_carrier],
]

export const SHIP_ROLES: ShipRole[] = RULES.map(([r]) => r)

export function shipRoles(v: Vehicle): ShipRole[] {
  return RULES.filter(([, test]) => test(v)).map(([r]) => r)
}

export interface ShipOffers {
  buy: VehiclePrice[]
  rent: VehicleRent[]
  minBuy: number | null
  minRent: number | null
}

export function shipOffers(vehicleId: number, purchases: VehiclePrice[], rentals: VehicleRent[]): ShipOffers {
  const buy = purchases.filter((p) => p.id_vehicle === vehicleId && p.price_buy > 0).sort((a, b) => a.price_buy - b.price_buy)
  const rent = rentals.filter((p) => p.id_vehicle === vehicleId && p.price_rent > 0).sort((a, b) => a.price_rent - b.price_rent)
  return { buy, rent, minBuy: buy[0]?.price_buy ?? null, minRent: rent[0]?.price_rent ?? null }
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function searchShips(vehicles: Vehicle[], query: string, role?: ShipRole): Vehicle[] {
  const q = norm(query.trim())
  return vehicles.filter(
    (v) =>
      (!q || [v.name, v.name_full, v.company_name ?? ''].some((s) => norm(s).includes(q))) &&
      (!role || shipRoles(v).includes(role)),
  )
}

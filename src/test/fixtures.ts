import type { Commodity, CommodityStatus, PriceRow, Terminal, Vehicle } from '../data/types'

export const NOW = 1_800_000_000_000
export const SEC = NOW / 1000

export function commodity(id: number, name: string, extra: Partial<Commodity> = {}): Commodity {
  return {
    id, name, code: name.slice(0, 4).toUpperCase(), kind: 'Metal', price_buy: 0, price_sell: 0,
    is_illegal: 0, is_harvestable: 0, is_raw: 0, is_refined: 1, is_buyable: 1, is_sellable: 1,
    ids_planets: null, ids_moons: null, date_modified: SEC, ...extra,
  }
}

let nextId = 1000
export function price(id_commodity: number, id_terminal: number, extra: Partial<PriceRow> = {}): PriceRow {
  return {
    id: nextId++, id_commodity, id_terminal, price_buy: 0, price_buy_avg: 0, price_sell: 0, price_sell_avg: 0,
    scu_buy: 0, scu_buy_avg: 0, scu_sell_stock: 0, scu_sell: 0, scu_sell_avg: 0, status_buy: 0, status_sell: 0,
    date_modified: SEC - 3 * 3600, commodity_name: '', terminal_name: `Terminal ${id_terminal}`, ...extra,
  }
}

export function terminal(id: number, extra: Partial<Terminal> = {}): Terminal {
  return {
    id, name: `Terminal ${id}`, displayname: `Terminal ${id}`, type: 'commodity', star_system_name: 'Stanton',
    planet_name: 'Hurston', moon_name: null, space_station_name: null, city_name: null, outpost_name: null, ...extra,
  }
}

export function vehicle(id: number, name: string, scu: number, extra: Partial<Vehicle> = {}): Vehicle {
  return { id, name, name_full: name, scu, is_cargo: scu > 0 ? 1 : 0, is_mining: 0, is_salvage: 0, is_ground_vehicle: 0, ...extra } as Vehicle
}

export const STATUS: CommodityStatus = {
  buy: [
    { code: 1, name: 'Out of Stock (Empty)', name_short: 'Out Stock', colors: 'red' },
    { code: 4, name: 'Medium Inventory', name_short: 'Medium', colors: 'blue' },
  ],
  sell: [
    { code: 1, name: 'Out of Stock (Empty)', name_short: 'Out Stock', colors: 'red' },
    { code: 4, name: 'Medium Inventory', name_short: 'Medium', colors: 'blue' },
  ],
}

export const LARANITE = commodity(47, 'Laranite', { price_buy: 7346, price_sell: 8600 })
export const GOLD = commodity(30, 'Gold', { price_buy: 5900, price_sell: 6400 })
export const HADANITE = commodity(36, 'Hadanite', { is_harvestable: 1, is_raw: 1, is_refined: 0, ids_planets: '4', ids_moons: '1' })

export const PRICES: PriceRow[] = [
  price(47, 8, { price_buy: 7047, scu_buy: 434, status_buy: 4, terminal_name: 'ArcCorp 141', commodity_name: 'Laranite' }),
  price(47, 12, { price_sell: 8500, scu_sell: 1000, status_sell: 4, terminal_name: 'TDD Area 18', commodity_name: 'Laranite' }),
  price(47, 13, { price_sell: 8700, scu_sell: 0, scu_sell_avg: 0, status_sell: 1, terminal_name: 'Lorville CBD', commodity_name: 'Laranite' }),
  price(30, 8, { price_buy: 5900, scu_buy: 200, terminal_name: 'ArcCorp 141', commodity_name: 'Gold' }),
  price(36, 12, { price_sell: 526545, scu_sell: 20, terminal_name: 'TDD Area 18', commodity_name: 'Hadanite' }),
]

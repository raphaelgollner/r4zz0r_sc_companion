/** Tipos dos recursos do UEX usados pelo app (só os campos que o app lê). */

export interface Commodity {
  id: number
  name: string
  code: string
  kind: string | null
  price_buy: number
  price_sell: number
  is_illegal: number
  is_harvestable: number
  is_raw: number
  is_refined: number
  is_buyable: number
  is_sellable: number
  ids_planets: string | null
  ids_moons: string | null
  date_modified: number
}

/** Linha de `commodities_prices_all`. Preços por SCU; datas em segundos Unix. */
export interface PriceRow {
  id: number
  id_commodity: number
  id_terminal: number
  price_buy: number
  price_buy_avg: number
  price_sell: number
  price_sell_avg: number
  scu_buy: number
  scu_buy_avg: number
  scu_sell_stock: number
  scu_sell: number
  scu_sell_avg: number
  status_buy: number
  status_sell: number
  date_modified: number
  commodity_name: string
  terminal_name: string
}

export interface StatusLevel {
  code: number
  name: string
  name_short: string
  colors: string
}

export interface CommodityStatus {
  buy: StatusLevel[]
  sell: StatusLevel[]
}

export interface Vehicle {
  id: number
  name: string
  name_full: string
  scu: number
  is_cargo: number
  is_mining: number
  is_salvage: number
  is_ground_vehicle: number
}

export interface Terminal {
  id: number
  name: string
  displayname: string
  type: string
  star_system_name: string | null
  planet_name: string | null
  moon_name: string | null
  space_station_name: string | null
  city_name: string | null
  outpost_name: string | null
}

export interface Planet {
  id: number
  name: string
}

export interface Moon {
  id: number
  name: string
}

export interface CurrencyIndexComponent {
  id_commodity: number
  commodity_name: string
  weight: number
  avg_price: number
  base_price: number
}

export interface CurrencyIndex {
  currency: string
  index_value: number
  basket_value: number
  date_modified: number
  components: CurrencyIndexComponent[]
}

export interface CurrencyIndexPoint {
  index_value: number
  date_added: number
}

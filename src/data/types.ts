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
  percentage?: string
}

export interface CommodityStatus {
  buy: StatusLevel[]
  sell: StatusLevel[]
}

export interface Vehicle {
  id: number
  /** Identificador do jogo: liga a nave à Star Citizen Wiki. */
  uuid?: string
  name: string
  name_full: string
  company_name?: string
  scu: number
  crew?: string
  pad_type?: string | null
  url_photo?: string | null
  is_cargo: number
  is_mining: number
  is_salvage: number
  is_ground_vehicle: number
  is_military?: number
  is_bomber?: number
  is_exploration?: number
  is_passenger?: number
  is_racing?: number
  is_refinery?: number
  is_refuel?: number
  is_repair?: number
  is_medical?: number
  is_science?: number
  is_research?: number
  is_stealth?: number
  is_starter?: number
  is_construction?: number
  is_datarunner?: number
  is_interdiction?: number
  is_carrier?: number
  is_spaceship?: number
  is_tractor_beam?: number
  is_industrial?: number
}

/** Preço de pledge (dinheiro real) por moeda (`vehicles_prices`). */
export interface PledgePrice {
  id: number
  id_vehicle: number
  price: number
  currency: string
  date_modified: number
}

export interface VehiclePrice {
  id: number
  id_vehicle: number
  id_terminal: number
  price_buy: number
  date_modified: number
  vehicle_name: string
  terminal_name: string
}

export interface VehicleRent {
  id: number
  id_vehicle: number
  id_terminal: number
  price_rent: number
  date_modified: number
  vehicle_name: string
  terminal_name: string
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

export interface PriceHistoryPoint {
  price_buy: number
  price_sell: number
  date_added: number
}

export interface RefineryYield {
  id_commodity: number
  id_terminal: number
  commodity_name: string
  terminal_name: string
  value: number
  date_modified: number
}

export interface RefineryMethod {
  id: number
  name: string
  code: string
  rating_yield: number
  rating_cost: number
  rating_speed: number
}

export interface RefineryCapacity {
  id_terminal: number
  terminal_name: string
  value: number
  date_modified: number
}

export interface RawPriceRow {
  id: number
  id_commodity: number
  id_terminal: number
  price_sell: number
  date_modified: number
  commodity_name: string
  terminal_name: string
}

export interface Item {
  id: number
  /** Identificador do jogo: liga o item à Star Citizen Wiki. */
  uuid?: string | null
  /** > 0 quando o item é exclusivo de uma nave (ex.: Pitman → Golem). */
  id_vehicle?: number
  vehicle_name?: string | null
  id_category: number
  name: string
  company_name: string | null
  size: string | null
  category: string
}

export interface ItemAttribute {
  id_item: number
  attribute_name: string
  value: string
  unit: string
}

export interface ItemPrice {
  id: number
  id_item: number
  id_terminal: number
  price_buy: number
  date_modified: number
  item_name: string
  terminal_name: string
}

export interface TerminalDistance {
  distance: string
}

export type UexResource =
  | 'commodities'
  | 'commodities_prices_all'
  | 'commodities_status'
  | 'vehicles'
  | 'terminals'
  | 'planets'
  | 'moons'
  | 'currencies_index'
  | 'currencies_index_history'

const MIN = 60_000
const HOUR = 60 * MIN

/** Tempo de vida do cache por recurso (segue a frequência de atualização do UEX). */
export const TTL_MS: Record<UexResource, number> = {
  commodities: 1 * HOUR,
  commodities_prices_all: 30 * MIN,
  commodities_status: 12 * HOUR,
  vehicles: 12 * HOUR,
  terminals: 12 * HOUR,
  planets: 12 * HOUR,
  moons: 12 * HOUR,
  currencies_index: 1 * HOUR,
  currencies_index_history: 12 * HOUR,
}

export const ALL_RESOURCES = Object.keys(TTL_MS) as UexResource[]

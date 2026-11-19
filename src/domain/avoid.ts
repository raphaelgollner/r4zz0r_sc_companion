import type { Terminal } from '../data/types'

/** Lugar que o jogador não quer visitar: um sistema, um planeta dele ou um lugar (lua, estação, cidade, posto) do planeta. */
export interface AvoidEntry {
  system: string
  planet?: string
  place?: string
}

const TRADE_TYPES = ['commodity', 'commodity_raw']

/** Mesmo critério de `buildLocationTree`: a lua vem antes da estação, da cidade e do posto. */
export function placeOf(t: Terminal): string | null {
  return t.moon_name || t.space_station_name || t.city_name || t.outpost_name || null
}

/** O terminal fica num lugar evitado? Terminal desconhecido nunca é excluído. */
export function avoidMatch(t: Terminal | undefined, avoid: AvoidEntry[]): boolean {
  if (!t || avoid.length === 0) return false
  return avoid.some(
    (e) =>
      e.system === t.star_system_name &&
      (!e.planet || e.planet === t.planet_name) &&
      (!e.place || e.place === placeOf(t)),
  )
}

export const avoidKey = (e: AvoidEntry) => `${e.system}/${e.planet ?? ''}/${e.place ?? ''}`
export const avoidLabel = (e: AvoidEntry) => e.place ?? e.planet ?? e.system

/** Sistemas, planetas e lugares dos terminais de comércio, sem repetição, em ordem sistema › planeta › lugar. */
export function avoidOptions(terminals: Terminal[]): AvoidEntry[] {
  const out = new Map<string, AvoidEntry>()
  const add = (e: AvoidEntry) => out.set(avoidKey(e), e)
  for (const t of terminals) {
    if (!TRADE_TYPES.includes(t.type) || !t.star_system_name) continue
    const system = t.star_system_name
    add({ system })
    const place = placeOf(t)
    if (!t.planet_name) {
      // estação no espaço profundo (ex.: Ruin Station): evitável sozinha, sem planeta
      if (place) add({ system, place })
      continue
    }
    add({ system, planet: t.planet_name })
    if (place) add({ system, planet: t.planet_name, place })
  }
  return [...out.values()].sort((a, b) => avoidKey(a).localeCompare(avoidKey(b), 'en'))
}

import type { Terminal } from '../data/types'

/** Sistema › Planeta › Lua › Estação/Cidade/Posto, só com os níveis que existem. */
export function locationPath(t: Terminal): string[] {
  const parts = [t.star_system_name, t.planet_name, t.moon_name, t.space_station_name ?? t.city_name ?? t.outpost_name]
  const out: string[] = []
  for (const p of parts) if (p && p !== out[out.length - 1]) out.push(p)
  return out
}

/** Nome do lugar onde o terminal fica (o mais específico que existir). */
export function placeName(t: Terminal): string | null {
  return t.space_station_name || t.city_name || t.outpost_name || t.moon_name || t.planet_name || null
}

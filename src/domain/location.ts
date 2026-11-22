import type { Terminal } from '../data/types'

export function locationPath(t: Terminal): string[] {
  const parts = [t.star_system_name, t.planet_name, t.moon_name, t.space_station_name ?? t.city_name ?? t.outpost_name]
  const out: string[] = []
  for (const p of parts) if (p && p !== out[out.length - 1]) out.push(p)
  return out
}

export function placeName(t: Terminal): string | null {
  return t.space_station_name || t.city_name || t.outpost_name || t.moon_name || t.planet_name || null
}

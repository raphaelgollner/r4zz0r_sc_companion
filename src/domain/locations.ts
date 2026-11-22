import type { Commodity, Moon, Planet, Terminal } from '../data/types'

export interface LocationNode {
  label: string
  children: LocationNode[]
  terminals: Terminal[]
}

const byLabel = (a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label, 'pt-BR')

function child(parent: Map<string, LocationNode>, label: string): LocationNode {
  let n = parent.get(label)
  if (!n) parent.set(label, (n = { label, children: [], terminals: [] }))
  return n
}

export function buildLocationTree(
  terminals: Terminal[],
  types: string[] = ['commodity', 'commodity_raw'],
  deepSpaceLabel = 'Espaço profundo',
): LocationNode[] {
  const systems = new Map<string, LocationNode>()
  const planetMaps = new Map<LocationNode, Map<string, LocationNode>>()
  const placeMaps = new Map<LocationNode, Map<string, LocationNode>>()

  for (const t of terminals) {
    if (!types.includes(t.type)) continue
    const system = child(systems, t.star_system_name || '?')
    if (!planetMaps.has(system)) planetMaps.set(system, new Map())
    const planet = child(planetMaps.get(system)!, t.planet_name || deepSpaceLabel)
    const placeName = t.moon_name || t.space_station_name || t.city_name || t.outpost_name
    if (!placeName) {
      planet.terminals.push(t)
      continue
    }
    if (!placeMaps.has(planet)) placeMaps.set(planet, new Map())
    child(placeMaps.get(planet)!, placeName).terminals.push(t)
  }

  const finish = (n: LocationNode, kids?: Map<string, LocationNode>): LocationNode => {
    n.children = kids ? [...kids.values()].sort(byLabel) : []
    n.terminals.sort((a, b) => a.displayname.localeCompare(b.displayname, 'pt-BR'))
    return n
  }

  return [...systems.values()].sort(byLabel).map((s) => {
    const planets = planetMaps.get(s)!
    planets.forEach((p) => {
      finish(p, placeMaps.get(p))
      p.children.forEach((place) => finish(place))
    })
    return finish(s, planets)
  })
}

const ids = (csv: string | null | undefined) =>
  (csv ?? '')
    .split(',')
    .map((x) => Number(x.trim()))
    .filter((n) => Number.isInteger(n) && n > 0)

export function whereFound(c: Commodity, planets: Map<number, Planet>, moons: Map<number, Moon>): string[] {
  const names = new Set<string>()
  ids(c.ids_planets).forEach((id) => planets.get(id) && names.add(planets.get(id)!.name))
  ids(c.ids_moons).forEach((id) => moons.get(id) && names.add(moons.get(id)!.name))
  return [...names].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

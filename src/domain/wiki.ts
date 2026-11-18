/**
 * Dados da Star Citizen Wiki (gerados dos arquivos do jogo), reduzidos ao que o setup usa.
 * A leitura é defensiva: campo ausente vira null/[]/{}; nada aqui lança erro.
 */

export interface WikiPort {
  /** Nomes do pai até a porta, unidos com "/". Identifica a porta no setup salvo. */
  path: string
  name: string
  type: string
  /** '' quando a Wiki diz UNDEFINED ou nada. */
  subType: string
  minSize: number
  maxSize: number
  editable: boolean
  equippedUuid: string | null
  equippedName: string | null
  requiredTags: string[]
  ports: WikiPort[]
}

export interface WikiVehicle {
  uuid: string
  name: string
  role: string | null
  description: string | null
  msrp: number | null
  ports: WikiPort[]
}

export interface WikiItem {
  uuid: string
  name: string
  /** Nome interno do jogo (ex.: `Mining_Laser_TEST_Best`), usado para tirar variantes de teste. */
  className: string
  type: string
  subType: string
  size: number
  manufacturer: string | null
  tags: string[]
  ports: WikiPort[]
  /** Atributos numéricos usados para comparar e montar builds. */
  stats: Record<string, number>
  /** Módulo ativo (usos limitados). */
  active: boolean
  charges: number | null
}

type Obj = Record<string, unknown>
const obj = (v: unknown): Obj => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : {})
const str = (v: unknown): string => (typeof v === 'string' ? v : '')
const num = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN
  return Number.isFinite(n) ? n : null
}
const strList = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])
const subType = (v: unknown) => {
  const s = str(v)
  return s === 'UNDEFINED' ? '' : s
}
const placeholder = (s: string) => (s.includes('PLACEHOLDER') ? '' : s)

function normalizePort(raw: unknown, parent: string): WikiPort {
  const p = obj(raw)
  const name = str(p.name)
  const path = parent ? `${parent}/${name}` : name
  const sizes = obj(p.sizes)
  const eq = obj(p.equipped_item)
  const eqName = placeholder(str(eq.name))
  return {
    path,
    name,
    type: str(p.type),
    subType: subType(p.sub_type),
    minSize: num(sizes.min) ?? num(p.size) ?? 0,
    maxSize: num(sizes.max) ?? num(p.size) ?? 0,
    editable: p.editable === true,
    equippedUuid: eqName ? str(eq.uuid) || null : null,
    equippedName: eqName || null,
    requiredTags: strList(p.required_tags),
    ports: Array.isArray(p.ports) ? p.ports.map((c) => normalizePort(c, path)) : [],
  }
}

function description(v: unknown): string | null {
  if (typeof v === 'string') return v || null
  const d = obj(v)
  return str(d.en_EN) || null
}

export function normalizeVehicle(raw: unknown): WikiVehicle {
  const d = obj(raw)
  return {
    uuid: str(d.uuid),
    name: str(d.name),
    role: str(d.role) || null,
    description: description(d.description),
    msrp: num(d.msrp),
    ports: Array.isArray(d.ports) ? d.ports.map((p) => normalizePort(p, '')) : [],
  }
}

function addNumbers(stats: Record<string, number>, map: unknown) {
  for (const [k, v] of Object.entries(obj(map))) {
    const n = num(v)
    if (n !== null) stats[k] = n
  }
}

export function normalizeItem(raw: unknown): WikiItem {
  const d = obj(raw)
  const type = str(d.type)
  const stats: Record<string, number> = {}
  const laser = obj(d.mining_laser)
  if (Object.keys(laser).length) {
    const power = num(obj(laser.laser_power).max)
    if (power !== null) stats.power_max = power
    const range = num(laser.optimal_range)
    if (range !== null) stats.optimal_range = range
    const slots = num(laser.module_slots)
    if (slots !== null) stats.module_slots = slots
    addNumbers(stats, laser.modifier_map)
  }
  const mod = obj(d.mining_modifier)
  if (Object.keys(mod).length) {
    const pm = num(mod.power_modifier)
    if (pm !== null) stats.power_modifier = pm
    addNumbers(stats, mod.modifier_map)
  }
  // Os multiplicadores de salvage aparecem neutros (1) em itens de mineração: só valem para itens de salvage.
  if (type.startsWith('Salvage')) {
    const s = obj(obj(d.weapon_modifier).salvage)
    const speed = num(s.salvage_speed_multiplier)
    const eff = num(s.extraction_efficiency)
    const radius = num(s.radius_multiplier)
    if (speed !== null) stats.salvage_speed = speed
    if (eff !== null) stats.extraction_efficiency = eff
    if (radius !== null) stats.radius = radius
  }
  const manufacturer = d.manufacturer
  return {
    uuid: str(d.uuid),
    name: str(d.name),
    className: str(d.class_name),
    type,
    subType: subType(d.sub_type),
    size: num(d.size) ?? 0,
    manufacturer: typeof manufacturer === 'string' ? manufacturer || null : str(obj(manufacturer).name) || null,
    tags: strList(d.tags),
    ports: Array.isArray(d.ports) ? d.ports.map((p) => normalizePort(p, '')) : [],
    stats,
    active: str(mod.type) === 'Active',
    charges: str(mod.type) === 'Active' ? num(mod.charges) : null,
  }
}

/** Procura uma porta pelo caminho em toda a árvore. */
export function findPort(ports: WikiPort[], path: string): WikiPort | null {
  for (const p of ports) {
    if (p.path === path) return p
    const inner = findPort(p.ports, path)
    if (inner) return inner
  }
  return null
}

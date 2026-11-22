import type { Item, ItemPrice } from '../data/types'
import type { WikiItem, WikiPort, WikiVehicle } from './wiki'

export type SetupFunction = 'mining' | 'salvage' | 'tractor'

export const SLOT_TYPES: Record<SetupFunction, string[]> = {
  mining: ['WeaponMining'],
  salvage: ['SalvageHead'],
  tractor: ['TractorBeam'],
}
const FUNCTIONS = Object.keys(SLOT_TYPES) as SetupFunction[]

export const CHILD_TYPE: Record<string, string> = { WeaponMining: 'MiningModifier', SalvageHead: 'SalvageModifier' }
const SLOT_LABEL: Record<SetupFunction, string> = { mining: 'Laser', salvage: 'Salvage Head', tractor: 'Tractor Beam' }

export interface Slot {
  fn: SetupFunction
  port: WikiPort
  label: string
}

const fnOf = (type: string): SetupFunction | null => FUNCTIONS.find((f) => SLOT_TYPES[f].includes(type)) ?? null

export function industrialSlots(v: WikiVehicle): Slot[] {
  const out: Slot[] = []
  const count: Record<SetupFunction, number> = { mining: 0, salvage: 0, tractor: 0 }
  const walk = (ports: WikiPort[]) => {
    for (const p of ports) {
      const fn = fnOf(p.type)
      if (fn && p.editable) {
        count[fn]++
        out.push({ fn, port: p, label: `${SLOT_LABEL[fn]} ${count[fn]}` })
        continue
      }
      walk(p.ports)
    }
  }
  walk(v.ports)
  return out
}

export function functionsOf(v: WikiVehicle): SetupFunction[] {
  const present = new Set(industrialSlots(v).map((s) => s.fn))
  return FUNCTIONS.filter((f) => present.has(f))
}

export function fits(item: WikiItem, port: WikiPort, vehicleUexId: number, uexByUuid: Map<string, Item>): boolean {
  if (item.type !== port.type) return false
  if (item.subType !== port.subType) return false
  if (item.size < port.minSize || item.size > port.maxSize) return false
  if (!port.requiredTags.every((t) => item.tags.includes(t))) return false
  const exclusive = uexByUuid.get(item.uuid)?.id_vehicle ?? 0
  if (exclusive > 0 && exclusive !== vehicleUexId) return false
  return true
}

export function chosenItem(port: WikiPort, setup: Record<string, string>, items: Map<string, WikiItem>): WikiItem | null {
  const uuid = setup[port.path] ?? port.equippedUuid
  return uuid ? items.get(uuid) ?? null : null
}

export function childPorts(port: WikiPort, setup: Record<string, string>, items: Map<string, WikiItem>): WikiPort[] {
  const childType = CHILD_TYPE[port.type]
  if (!childType) return []
  const custom = setup[port.path]
  const isStock = !custom || custom === port.equippedUuid
  if (isStock) {
    const declared = port.ports.filter((c) => c.type === childType)
    if (declared.length) return declared.map((c) => ({ ...c, editable: true }))
  }
  const item = chosenItem(port, setup, items)
  if (!item) return []
  return item.ports.filter((c) => c.type === childType).map((c) => ({ ...c, path: `${port.path}/${c.name}`, editable: true }))
}

export function pruneSetup(setup: Record<string, string>, v: WikiVehicle, items: Map<string, WikiItem>): Record<string, string> {
  const valid = new Set<string>()

  const unknownParents: string[] = []
  for (const s of industrialSlots(v)) {
    valid.add(s.port.path)
    const custom = setup[s.port.path]
    if (custom && custom !== s.port.equippedUuid && !items.has(custom)) unknownParents.push(`${s.port.path}/`)
    for (const c of childPorts(s.port, setup, items)) valid.add(c.path)
  }
  return Object.fromEntries(Object.entries(setup).filter(([k]) => valid.has(k) || unknownParents.some((p) => k.startsWith(p))))
}

export function applyBuild(setup: Record<string, string>, build: Build, v: WikiVehicle): Record<string, string> {
  const own = industrialSlots(v)
    .filter((s) => s.fn === build.fn)
    .map((s) => s.port.path)
  const keep = Object.entries(setup).filter(([k]) => !own.some((p) => k === p || k.startsWith(`${p}/`)))
  return { ...Object.fromEntries(keep), ...build.setup }
}

const TEST_VARIANT = /test|_arm$|placeholder/i

export function cleanItems(items: WikiItem[], stock: Set<string>, uexByUuid: Map<string, Item>): WikiItem[] {
  const groups = new Map<string, WikiItem[]>()
  for (const i of items) {
    if (TEST_VARIANT.test(i.className) && !stock.has(i.uuid)) continue
    const k = `${i.type}|${i.size}|${i.name}`
    groups.set(k, [...(groups.get(k) ?? []), i])
  }
  return [...groups.values()].map((g) => g.find((i) => stock.has(i.uuid)) ?? g.find((i) => uexByUuid.has(i.uuid)) ?? g[0])
}

export interface Build {
  id: string
  fn: SetupFunction

  nameKey: string

  criterionKey: string
  setup: Record<string, string>
}

type Score = (i: WikiItem) => number
const s = (i: WikiItem, k: string) => i.stats[k] ?? 0
const stableScore: Score = (i) => -s(i, 'laser_instability') + s(i, 'optimal_charge_window_size')
const powerScore: Score = (i) => (i.type === 'WeaponMining' ? s(i, 'power_max') : s(i, 'power_modifier'))

function rank(cands: WikiItem[], score: Score, stockUuid: string | null): WikiItem[] {
  return [...cands].sort((a, b) => score(b) - score(a) || Number(b.uuid === stockUuid) - Number(a.uuid === stockUuid) || a.name.localeCompare(b.name))
}

function balancedScore(cands: WikiItem[], stockUuid: string | null): Score {
  const pos = (list: WikiItem[]) => new Map(list.map((x, i) => [x.uuid, i]))
  const a = pos(rank(cands, stableScore, stockUuid))
  const b = pos(rank(cands, powerScore, stockUuid))
  return (i) => -((a.get(i.uuid) ?? 0) + (b.get(i.uuid) ?? 0))
}

function pick(port: WikiPort, cands: WikiItem[], scoreFor: (c: WikiItem[]) => Score): WikiItem | null {
  if (!cands.length) return null
  const isModule = port.type === CHILD_TYPE.WeaponMining || port.type === CHILD_TYPE.SalvageHead
  if (!isModule) return rank(cands, scoreFor(cands), port.equippedUuid)[0]
  const passive = cands.filter((c) => !c.active)
  const active = cands.filter((c) => c.active)
  const score = scoreFor(cands)
  const bestPassive = passive.length ? rank(passive, score, port.equippedUuid)[0] : null
  const bestActive = active.length ? rank(active, score, port.equippedUuid)[0] : null
  if (bestActive && score(bestActive) > 0 && (!bestPassive || score(bestPassive) <= 0)) return bestActive
  return bestPassive ?? null
}

const CRITERIA: Record<SetupFunction, { id: string; score: (port: WikiPort) => (c: WikiItem[]) => Score }[]> = {
  mining: [
    { id: 'stable', score: () => () => stableScore },
    { id: 'power', score: () => () => powerScore },
    { id: 'balanced', score: (port) => (c) => balancedScore(c, port.equippedUuid) },
  ],
  salvage: [
    { id: 'speed', score: () => () => (i) => s(i, 'salvage_speed') },
    { id: 'efficiency', score: () => () => (i) => s(i, 'extraction_efficiency') },
  ],
  tractor: [],
}

export function buildsFor(v: WikiVehicle, items: WikiItem[], vehicleUexId: number, uexByUuid: Map<string, Item>): Build[] {
  const slots = industrialSlots(v)
  const byUuid = new Map(items.map((i) => [i.uuid, i]))
  const out: Build[] = []
  for (const fn of functionsOf(v)) {
    for (const c of CRITERIA[fn]) {
      const setup: Record<string, string> = {}
      for (const slot of slots.filter((x) => x.fn === fn)) {
        const main = pick(slot.port, items.filter((i) => fits(i, slot.port, vehicleUexId, uexByUuid)), c.score(slot.port))
        if (main && main.uuid !== slot.port.equippedUuid) setup[slot.port.path] = main.uuid
        for (const child of childPorts(slot.port, setup, byUuid)) {
          const mod = pick(child, items.filter((i) => fits(i, child, vehicleUexId, uexByUuid)), c.score(child))
          if (mod && mod.uuid !== child.equippedUuid) setup[child.path] = mod.uuid
        }
      }
      out.push({ id: `${fn}-${c.id}`, fn, nameKey: `build.${c.id}`, criterionKey: `build.${c.id}.criterion`, setup })
    }
  }
  return out
}

export function setupCost(setup: Record<string, string>, uexByUuid: Map<string, Item>, prices: ItemPrice[]): { total: number; missing: number } {
  let total = 0
  let missing = 0
  for (const uuid of Object.values(setup)) {
    const uex = uexByUuid.get(uuid)
    let best: number | null = null
    if (uex) for (const p of prices) if (p.id_item === uex.id && p.price_buy > 0 && (best === null || p.price_buy < best)) best = p.price_buy
    if (best === null) missing++
    else total += best
  }
  return { total, missing }
}

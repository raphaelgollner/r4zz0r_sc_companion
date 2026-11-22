import { useSyncExternalStore } from 'react'
import type { Vehicle } from '../data/types'
import type { AvoidEntry } from '../domain/avoid'
import { RISKS, type MaxRisk } from '../domain/risk'
import { DEFAULT_THEME, isThemeId, type ThemeId } from '../ui/themes'

export interface Prefs {
  shipId: number | null
  budget: number
  excludeIllegal: boolean
  originSystem: string
  sortBy: 'profit' | 'roi'
  warnHours: number
  staleDays: number

  scuOverrides: Record<number, number>

  avoid: AvoidEntry[]

  maxRisk: MaxRisk

  routeMode: 'list' | 'path' | 'roundabout'

  shortDistances: boolean

  pathStart: number | null

  pathLegs: number

  theme: ThemeId

  dockFilter: boolean
}

export const DEFAULT_PREFS: Prefs = {
  shipId: null,
  budget: 0,
  excludeIllegal: true,
  originSystem: '',
  sortBy: 'profit',
  warnHours: 24,
  staleDays: 7,
  scuOverrides: {},
  avoid: [],
  maxRisk: 'any',
  routeMode: 'list',
  shortDistances: false,
  pathStart: null,
  pathLegs: 4,
  theme: DEFAULT_THEME,
  dockFilter: true,
}

const KEY = 'tayko.prefs'

export function effectiveScu(prefs: Prefs, ship: Vehicle | null): number {
  if (!ship) return 0
  return prefs.scuOverrides[ship.id] ?? ship.scu
}

function cleanAvoid(v: unknown): AvoidEntry[] {
  if (!Array.isArray(v)) return []
  return v.filter((e): e is AvoidEntry => typeof e === 'object' && e !== null && typeof (e as AvoidEntry).system === 'string')
}

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT_PREFS }
    const parsed = JSON.parse(raw)
    if (typeof parsed !== 'object' || !parsed) return { ...DEFAULT_PREFS }
    const p = { ...DEFAULT_PREFS, ...parsed }
    const maxRisk: MaxRisk = RISKS.includes(p.maxRisk) ? p.maxRisk : 'any'
    const routeMode: Prefs['routeMode'] = ['list', 'path', 'roundabout'].includes(p.routeMode) ? p.routeMode : 'list'
    const pathLegs = Number.isInteger(p.pathLegs) && p.pathLegs >= 2 && p.pathLegs <= 8 ? p.pathLegs : 4
    const pathStart = Number.isInteger(p.pathStart) ? p.pathStart : null
    return { ...p, avoid: cleanAvoid(p.avoid), maxRisk, routeMode, shortDistances: p.shortDistances === true, pathStart, pathLegs, theme: isThemeId(p.theme) ? p.theme : DEFAULT_THEME, dockFilter: p.dockFilter !== false }
  } catch {
    return { ...DEFAULT_PREFS }
  }
}

export function savePrefs(p: Prefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {
  }
}

let current: Prefs | null = null
const subscribers = new Set<() => void>()
const getSnapshot = () => (current ??= loadPrefs())

export function updatePrefs(patch: Partial<Prefs>) {
  current = { ...getSnapshot(), ...patch }
  savePrefs(current)
  subscribers.forEach((s) => s())
}

export function usePrefs(): [Prefs, (patch: Partial<Prefs>) => void] {
  const prefs = useSyncExternalStore(
    (cb) => {
      subscribers.add(cb)
      return () => subscribers.delete(cb)
    },
    getSnapshot,
  )
  return [prefs, updatePrefs]
}

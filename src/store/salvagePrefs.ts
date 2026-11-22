import { useSyncExternalStore } from 'react'
import type { SalvageLine } from '../domain/salvage'

export interface SalvagePrefs {
  shipId: number | null
  locationId: number | null
  cargo: SalvageLine[]
  sortBy: 'value' | 'distance'
}

export const DEFAULT_SALVAGE_PREFS: SalvagePrefs = { shipId: null, locationId: null, cargo: [], sortBy: 'value' }

const KEY = 'tayko.salvage'

export function loadSalvagePrefs(): SalvagePrefs {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT_SALVAGE_PREFS }
    const parsed = JSON.parse(raw)
    if (typeof parsed !== 'object' || !parsed) return { ...DEFAULT_SALVAGE_PREFS }
    const p = { ...DEFAULT_SALVAGE_PREFS, ...parsed }
    return { ...p, cargo: Array.isArray(p.cargo) ? p.cargo : [] }
  } catch {
    return { ...DEFAULT_SALVAGE_PREFS }
  }
}

function save(p: SalvagePrefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {
  }
}

let current: SalvagePrefs | null = null
const subscribers = new Set<() => void>()
const getSnapshot = () => (current ??= loadSalvagePrefs())

export function updateSalvagePrefs(patch: Partial<SalvagePrefs>) {
  current = { ...getSnapshot(), ...patch }
  save(current)
  subscribers.forEach((s) => s())
}

export function useSalvagePrefs(): [SalvagePrefs, (patch: Partial<SalvagePrefs>) => void] {
  const prefs = useSyncExternalStore(
    (cb) => {
      subscribers.add(cb)
      return () => subscribers.delete(cb)
    },
    getSnapshot,
  )
  return [prefs, updateSalvagePrefs]
}

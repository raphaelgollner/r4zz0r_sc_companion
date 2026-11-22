import { useSyncExternalStore } from 'react'
import type { CargoLine } from '../domain/mining'

export interface MinerPrefs {
  cargo: CargoLine[]
  locationId: number | null
  sortBy: 'value' | 'distance'
}

export const DEFAULT_MINER_PREFS: MinerPrefs = { cargo: [], locationId: null, sortBy: 'value' }

const KEY = 'tayko.mining'

export function loadMinerPrefs(): MinerPrefs {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT_MINER_PREFS }
    const parsed = JSON.parse(raw)
    return typeof parsed === 'object' && parsed ? { ...DEFAULT_MINER_PREFS, ...parsed } : { ...DEFAULT_MINER_PREFS }
  } catch {
    return { ...DEFAULT_MINER_PREFS }
  }
}

export function saveMinerPrefs(p: MinerPrefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {
  }
}

let current: MinerPrefs | null = null
const subscribers = new Set<() => void>()
const getSnapshot = () => (current ??= loadMinerPrefs())

export function updateMinerPrefs(patch: Partial<MinerPrefs>) {
  current = { ...getSnapshot(), ...patch }
  saveMinerPrefs(current)
  subscribers.forEach((s) => s())
}

export function useMinerPrefs(): [MinerPrefs, (patch: Partial<MinerPrefs>) => void] {
  const prefs = useSyncExternalStore(
    (cb) => {
      subscribers.add(cb)
      return () => subscribers.delete(cb)
    },
    getSnapshot,
  )
  return [prefs, updateMinerPrefs]
}

import { useSyncExternalStore } from 'react'
import type { Vehicle } from '../data/types'

export interface Prefs {
  shipId: number | null
  budget: number
  excludeIllegal: boolean
  originSystem: string
  sortBy: 'profit' | 'roi'
  warnHours: number
  staleDays: number
  /** SCU digitado pelo usuário por nave (ex.: Galaxy com módulo de carga). */
  scuOverrides: Record<number, number>
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
}

const KEY = 'tayko.prefs'

/** SCU que vale para a nave: o digitado pelo usuário ou o do UEX. */
export function effectiveScu(prefs: Prefs, ship: Vehicle | null): number {
  if (!ship) return 0
  return prefs.scuOverrides[ship.id] ?? ship.scu
}

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT_PREFS }
    const parsed = JSON.parse(raw)
    return typeof parsed === 'object' && parsed ? { ...DEFAULT_PREFS, ...parsed } : { ...DEFAULT_PREFS }
  } catch {
    return { ...DEFAULT_PREFS }
  }
}

export function savePrefs(p: Prefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {
    // sem armazenamento: vale só nesta sessão
  }
}

// Estado compartilhado entre telas (INÍCIO, Routes e AJUSTES leem as mesmas preferências).
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

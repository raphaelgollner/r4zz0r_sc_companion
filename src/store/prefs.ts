import { useSyncExternalStore } from 'react'

export interface Prefs {
  shipId: number | null
  budget: number
  excludeIllegal: boolean
  originSystem: string
  sortBy: 'profit' | 'roi'
  warnHours: number
  staleDays: number
}

export const DEFAULT_PREFS: Prefs = {
  shipId: null,
  budget: 0,
  excludeIllegal: true,
  originSystem: '',
  sortBy: 'profit',
  warnHours: 24,
  staleDays: 7,
}

const KEY = 'tayko.prefs'

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

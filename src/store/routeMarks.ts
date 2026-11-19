import { useSyncExternalStore } from 'react'
import { MARK_KINDS, type MarkRecord } from '../domain/routeMarks'

export type RouteMarks = Record<string, MarkRecord>

const KEY = 'tayko.routeMarks'

function valid(r: unknown): r is MarkRecord {
  if (typeof r !== 'object' || r === null) return false
  const m = r as MarkRecord
  return (
    Array.isArray(m.marks) &&
    m.marks.length > 0 &&
    m.marks.every((k) => MARK_KINDS.includes(k)) &&
    typeof m.buyAt === 'number' &&
    typeof m.sellAt === 'number'
  )
}

export function loadRouteMarks(): RouteMarks {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '{}')
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}
    return Object.fromEntries(Object.entries(parsed).filter(([, r]) => valid(r))) as RouteMarks
  } catch {
    return {}
  }
}

let current: RouteMarks | null = null
const subscribers = new Set<() => void>()
const getSnapshot = () => (current ??= loadRouteMarks())

/** Grava (ou apaga, com `undefined`) as marcações de uma rota. */
export function setRouteMark(key: string, rec: MarkRecord | undefined) {
  const next = { ...getSnapshot() }
  if (rec) next[key] = rec
  else delete next[key]
  current = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // sem armazenamento: vale só nesta sessão
  }
  subscribers.forEach((s) => s())
}

export function resetRouteMarksForTest() {
  current = null
}

export function useRouteMarks(): [RouteMarks, typeof setRouteMark] {
  const marks = useSyncExternalStore(
    (cb) => {
      subscribers.add(cb)
      return () => subscribers.delete(cb)
    },
    getSnapshot,
  )
  return [marks, setRouteMark]
}

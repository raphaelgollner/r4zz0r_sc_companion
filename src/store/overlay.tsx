import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { KVStore } from '../cache/store'
import { activeOverlay, appendTail, EMPTY_OVERLAY, endOverlay, startOverlay, type OverlayData } from '../domain/overlay'
import { defaultLiveDeps, overlayStore, type LiveDeps } from './overlayDeps'

const KEY = 'data'
const POLL_MS = 5_000

export type { LiveDeps }

export type LiveError = 'noDir' | 'readFailed' | null

interface OverlayValue {
  data: OverlayData
  ready: boolean
  apply: (fn: (d: OverlayData) => OverlayData) => void
  start: () => Promise<void>
  end: () => void
  lastRead: number | null
  error: LiveError
}

const OverlayContext = createContext<OverlayValue | null>(null)
let defaultKv: KVStore | null = null
const newId = () => (typeof globalThis.crypto?.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`)

export function OverlayProvider({ store, live = defaultLiveDeps, children }: { store?: KVStore; live?: LiveDeps; children: ReactNode }) {
  const kv = useMemo(() => store ?? (defaultKv ??= overlayStore()), [store])
  const [data, setData] = useState<OverlayData>(EMPTY_OVERLAY)
  const [ready, setReady] = useState(false)
  const [lastRead, setLastRead] = useState<number | null>(null)
  const [error, setError] = useState<LiveError>(null)
  const ref = useRef(data)
  const dirRef = useRef<string | null>(null)
  const busy = useRef(false)

  useEffect(() => {
    let active = true
    kv.get(KEY)
      .then((raw) => {
        if (!active || !raw || typeof raw !== 'object') return
        const loaded = { ...EMPTY_OVERLAY, ...(raw as OverlayData) }
        ref.current = loaded
        setData(loaded)
      })
      .catch(() => {})
      .finally(() => active && setReady(true))
    return () => {
      active = false
    }
  }, [kv])

  const apply = useCallback(
    (fn: (d: OverlayData) => OverlayData) => {
      const next = fn(ref.current)
      if (next === ref.current) return
      ref.current = next
      setData(next)
      kv.set(KEY, next).catch(() => {})
    },
    [kv],
  )

  const dir = useCallback(async () => (dirRef.current ??= await live.getDir().catch(() => null)), [live])

  const poll = useCallback(async () => {
    const s = activeOverlay(ref.current)
    if (!s || busy.current) return
    busy.current = true
    try {
      const d = await dir()
      if (!d) return setError('noDir')
      let t = await live.tail(d, s.offset)
      if (s.fileFirst !== null && t.first !== s.fileFirst) t = await live.tail(d, 0)
      apply((x) => appendTail(x, t))
      setLastRead(Date.now())
      setError(null)
    } catch {
      setError('readFailed')
    } finally {
      busy.current = false
    }
  }, [apply, dir, live])

  const active = !!activeOverlay(data)
  useEffect(() => {
    if (!ready || !active) return
    const first = setTimeout(() => void poll(), 0)
    const id = setInterval(() => void poll(), live.pollMs ?? POLL_MS)
    return () => {
      clearTimeout(first)
      clearInterval(id)
    }
  }, [ready, active, poll, live.pollMs])

  const start = useCallback(async () => {
    dirRef.current = null
    const d = await dir()
    if (!d) return setError('noDir')
    try {
      const t = await live.tail(d, null)
      apply((x) => startOverlay(x, Date.now(), newId(), { ...t, lines: [] }))
      setError(null)
    } catch {
      setError('readFailed')
    }
  }, [apply, dir, live])

  const end = useCallback(() => {
    void poll().finally(() => apply((x) => endOverlay(x, Date.now())))
  }, [apply, poll])

  const value = useMemo(() => ({ data, ready, apply, start, end, lastRead, error }), [data, ready, apply, start, end, lastRead, error])
  return <OverlayContext.Provider value={value}>{children}</OverlayContext.Provider>
}

export function useOverlay(): OverlayValue {
  const v = useContext(OverlayContext)
  if (!v) throw new Error('OverlayProvider ausente')
  return v
}

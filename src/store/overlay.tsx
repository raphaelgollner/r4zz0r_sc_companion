import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { KVStore } from '../cache/store'
import { activeOverlay, appendTail, CONFIRM_MS, EMPTY_OVERLAY, endOverlay, readingTarget, startOverlay, type LogTail, type OverlayData } from '../domain/overlay'
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
  end: () => Promise<void>
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

  const inflight = useRef<Promise<void> | null>(null)

  const readOnce = useCallback(async () => {
    const s = readingTarget(ref.current, Date.now())
    if (!s) return
    try {
      const d = await dir()
      if (!d) return setError('noDir')
      let t = await live.tail(d, s.offset)
      if (s.fileFirst !== null && t.first !== s.fileFirst) t = await live.tail(d, 0)
      apply((x) => appendTail(x, s.id, s.offset, t))
      setLastRead(Date.now())
      setError(null)
    } catch {
      setError('readFailed')
    }
  }, [apply, dir, live])

  const poll = useCallback(() => {
    if (!inflight.current) inflight.current = readOnce().finally(() => (inflight.current = null))
    return inflight.current
  }, [readOnce])

  const [closing, setClosing] = useState(false)
  const reading = !!activeOverlay(data) || closing
  useEffect(() => {
    if (!ready || !reading) return
    const first = setTimeout(() => void poll(), 0)
    const id = setInterval(() => void poll(), live.pollMs ?? POLL_MS)
    return () => {
      clearTimeout(first)
      clearInterval(id)
    }
  }, [ready, reading, poll, live.pollMs])

  const start = useCallback(async () => {
    dirRef.current = null
    const d = await dir()
    if (!d) return setError('noDir')
    let t: LogTail
    try {
      t = await live.tail(d, null)
    } catch (e) {
      if (String(e) !== 'no_logs') return setError('readFailed')
      t = { first: null, offset: 0, lines: [] }
    }
    apply((x) => startOverlay(x, Date.now(), newId(), { ...t, lines: [] }))
    setError(null)
  }, [apply, dir, live])

  const end = useCallback(async () => {
    await inflight.current
    await poll()
    apply((x) => endOverlay(x, Date.now()))
    setClosing(true)
    setTimeout(() => setClosing(false), CONFIRM_MS + 1_000)
  }, [apply, poll])

  const value = useMemo(() => ({ data, ready, apply, start, end, lastRead, error }), [data, ready, apply, start, end, lastRead, error])
  return <OverlayContext.Provider value={value}>{children}</OverlayContext.Provider>
}

export function useOverlay(): OverlayValue {
  const v = useContext(OverlayContext)
  if (!v) throw new Error('OverlayProvider ausente')
  return v
}

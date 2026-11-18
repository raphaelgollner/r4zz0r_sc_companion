import { createStore, get, set } from 'idb-keyval'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { KVStore } from '../cache/store'
import type { FleetEntry } from '../domain/fleet'

const KEY = 'data'
const WRITE_DELAY_MS = 400

/** Banco separado do cache do UEX: "Limpar cache" não apaga a frota. */
export function fleetStore(): KVStore {
  const db = createStore('tayko-companion-fleet', 'fleet')
  return {
    get: (key) => get(key, db),
    set: (key, value) => set(key, value, db),
    clear: async () => {
      // nunca limpamos a frota por aqui
    },
  }
}

/** Aceita só entradas bem formadas; o resto é descartado. */
function sanitize(raw: unknown): FleetEntry[] {
  const list = raw && typeof raw === 'object' ? (raw as { entries?: unknown }).entries : null
  if (!Array.isArray(list)) return []
  return list
    .filter((e): e is FleetEntry => !!e && typeof e === 'object' && typeof (e as FleetEntry).id === 'string' && typeof (e as FleetEntry).vehicleId === 'number')
    .map((e) => ({
      id: e.id,
      vehicleId: e.vehicleId,
      nickname: typeof e.nickname === 'string' ? e.nickname : '',
      note: typeof e.note === 'string' ? e.note : '',
      addedAt: typeof e.addedAt === 'number' ? e.addedAt : 0,
      setup: e.setup && typeof e.setup === 'object' ? { ...e.setup } : {},
    }))
}

export interface FleetValue {
  entries: FleetEntry[]
  ready: boolean
  /** true quando não deu para ler a frota salva: nada é gravado para não sobrescrever. */
  loadFailed: boolean
  add: (vehicleId: number) => string
  update: (id: string, patch: Partial<Omit<FleetEntry, 'id'>>) => void
  remove: (id: string) => void
}

const FleetContext = createContext<FleetValue | null>(null)
let defaultStore: KVStore | null = null

const newId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `f${Date.now()}${Math.random().toString(36).slice(2)}`)

export function FleetProvider({ store, children }: { store?: KVStore; children: ReactNode }) {
  const kv = useMemo(() => store ?? (defaultStore ??= fleetStore()), [store])
  const [entries, setEntries] = useState<FleetEntry[]>([])
  const [ready, setReady] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const loadFailedRef = useRef(false)
  const ref = useRef(entries)
  const pending = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    if (!pending.current) return
    pending.current = false
    kv.set(KEY, { entries: ref.current }).catch(() => {
      // falha ao gravar: segue em memória nesta sessão
    })
  }, [kv])

  useEffect(() => {
    let active = true
    kv.get(KEY)
      .then((raw) => {
        if (!active) return
        const loaded = sanitize(raw)
        ref.current = loaded
        setEntries(loaded)
      })
      .catch(() => {
        loadFailedRef.current = true
        if (active) setLoadFailed(true)
      })
      .finally(() => active && setReady(true))
    return () => {
      active = false
    }
  }, [kv])

  const apply = useCallback(
    (fn: (list: FleetEntry[]) => FleetEntry[]) => {
      if (loadFailedRef.current) return
      ref.current = fn(ref.current)
      setEntries(ref.current)
      pending.current = true
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(flush, WRITE_DELAY_MS)
    },
    [flush],
  )

  useEffect(() => {
    const onHide = () => document.visibilityState === 'hidden' && flush()
    window.addEventListener('beforeunload', flush)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      window.removeEventListener('beforeunload', flush)
      document.removeEventListener('visibilitychange', onHide)
      flush()
    }
  }, [flush])

  const add = useCallback(
    (vehicleId: number) => {
      const id = newId()
      apply((l) => [...l, { id, vehicleId, nickname: '', note: '', addedAt: Date.now(), setup: {} }])
      return id
    },
    [apply],
  )
  const update = useCallback((id: string, patch: Partial<Omit<FleetEntry, 'id'>>) => apply((l) => l.map((e) => (e.id === id ? { ...e, ...patch } : e))), [apply])
  const remove = useCallback((id: string) => apply((l) => l.filter((e) => e.id !== id)), [apply])

  const value = useMemo(() => ({ entries, ready, loadFailed, add, update, remove }), [entries, ready, loadFailed, add, update, remove])
  return <FleetContext.Provider value={value}>{children}</FleetContext.Provider>
}

const EMPTY: FleetValue = { entries: [], ready: true, loadFailed: false, add: () => '', update: () => {}, remove: () => {} }

/** Frota pessoal. Sem provider (ex.: telas testadas isoladas), devolve uma frota vazia. */
export function useFleet(): FleetValue {
  return useContext(FleetContext) ?? EMPTY
}

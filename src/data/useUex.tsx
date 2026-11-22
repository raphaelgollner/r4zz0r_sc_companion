import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { RateLimiter } from '../api/rateLimiter'
import { fetchUex, UexError } from '../api/uexClient'
import { getResource, peekResource } from '../cache/cachedResource'
import { idbStore, type KVStore } from '../cache/store'
import { TTL_MS, type UexResource } from './ttl'

interface UexContextValue {
  store: KVStore
  fetchFn?: typeof fetch
  limiter?: RateLimiter
}

let defaultStore: KVStore | null = null
function getDefaultStore() {
  defaultStore ??= idbStore()
  return defaultStore
}

const UexContext = createContext<UexContextValue | null>(null)

export function UexProvider({ value, children }: { value: UexContextValue; children: ReactNode }) {
  return <UexContext.Provider value={value}>{children}</UexContext.Provider>
}

function useUexContext(): UexContextValue {
  return useContext(UexContext) ?? { store: getDefaultStore() }
}

const listeners = new Set<(force: boolean) => void>()
export function refreshAll(force = true) {
  listeners.forEach((l) => l(force))
}

export async function clearCache(store: KVStore = getDefaultStore()) {
  await store.clear()
  refreshAll(true)
}

export interface UexState<T> {
  data: T | null
  fetchedAt: number | null
  loading: boolean
  error: string | null
  refresh: () => void
}

export function queryKey(resource: string, params?: Record<string, string | number> | null): string {
  if (!params) return resource
  const q = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&')
  return q ? `${resource}?${q}` : resource
}

export type FetchDeps = { fetchFn?: typeof fetch; limiter?: RateLimiter }

export function useCachedQuery<T>(key: string, fetcher: (deps: FetchDeps) => Promise<T>, ttlMs: number, enabled: boolean): UexState<T> {
  const { store, fetchFn, limiter } = useUexContext()
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher
  type S = Omit<UexState<T>, 'refresh'> & { key: string }
  const [raw, setRaw] = useState<S>({ key, data: null, fetchedAt: null, loading: enabled, error: null })

  const state: S = raw.key === key ? raw : { key, data: null, fetchedAt: null, loading: enabled, error: null }
  const setState = useCallback(
    (next: Omit<S, 'key'> | ((s: Omit<S, 'key'>) => Omit<S, 'key'>)) =>
      setRaw((prev) => {
        const base = prev.key === key ? prev : { key, data: null, fetchedAt: null, loading: enabled, error: null }
        return { ...(typeof next === 'function' ? next(base) : next), key }
      }),
    [key, enabled],
  )

  const load = useCallback(
    async (force: boolean, isActive: () => boolean) => {
      if (!enabled) {
        setState({ data: null, fetchedAt: null, loading: false, error: null })
        return
      }
      setState((s) => ({ ...s, loading: true }))
      if (!force) {
        const peek = await peekResource<T>(key, store)
        if (peek && isActive()) setState((s) => ({ ...s, data: peek.data, fetchedAt: peek.fetchedAt }))
      }
      try {
        const r = await getResource<T>(
          key,
          ttlMs,
          () => fetcherRef.current({ fetchFn, limiter }),
          store,
          Date.now,
          force,
        )
        if (isActive()) setState({ data: r.data, fetchedAt: r.fetchedAt, loading: false, error: r.error ?? null })
      } catch (e) {
        if (isActive()) setState((s) => ({ ...s, loading: false, error: e instanceof UexError ? e.code : 'unknown' }))
      }
    },
    [key, ttlMs, enabled, store, fetchFn, limiter, setState],
  )

  useEffect(() => {
    let active = true
    const isActive = () => active
    load(false, isActive)
    const listener = (force: boolean) => load(force, isActive)
    listeners.add(listener)
    return () => {
      active = false
      listeners.delete(listener)
    }
  }, [load])

  const refresh = useCallback(() => {
    load(true, () => true)
  }, [load])

  return useMemo(() => ({ data: state.data, fetchedAt: state.fetchedAt, loading: state.loading, error: state.error, refresh }), [state.data, state.fetchedAt, state.loading, state.error, refresh])
}

function useUexBase<T>(resource: string, params: Record<string, string | number> | null | undefined, ttlMs: number, enabled: boolean): UexState<T> {
  const key = queryKey(resource, params)
  return useCachedQuery<T>(key, (deps) => fetchUex<T>(resource, params ?? undefined, deps), ttlMs, enabled)
}

export function useUex<T>(resource: UexResource): UexState<T> {
  return useUexBase<T>(resource, undefined, TTL_MS[resource], true)
}

export function useUexQuery<T>(resource: string, params: Record<string, string | number> | null, ttlMs: number): UexState<T> {
  return useUexBase<T>(resource, params, ttlMs, params !== null)
}

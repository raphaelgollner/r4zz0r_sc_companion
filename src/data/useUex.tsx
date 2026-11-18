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

/** Troca a fonte de dados (usado nos testes). Sem provider, usa IndexedDB e a API real. */
export function UexProvider({ value, children }: { value: UexContextValue; children: ReactNode }) {
  return <UexContext.Provider value={value}>{children}</UexContext.Provider>
}

function useUexContext(): UexContextValue {
  return useContext(UexContext) ?? { store: getDefaultStore() }
}

/** Avisa todos os hooks montados que devem recarregar (ex.: "Atualizar tudo", "Limpar cache"). */
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

/** Chave de cache: recurso + parâmetros em ordem alfabética (ex.: `items?id_category=29`). */
export function queryKey(resource: string, params?: Record<string, string | number> | null): string {
  if (!params) return resource
  const q = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&')
  return q ? `${resource}?${q}` : resource
}

function useUexBase<T>(resource: string, params: Record<string, string | number> | null | undefined, ttlMs: number, enabled: boolean): UexState<T> {
  const { store, fetchFn, limiter } = useUexContext()
  const key = queryKey(resource, params)
  const paramsRef = useRef(params)
  paramsRef.current = params
  const [state, setState] = useState<Omit<UexState<T>, 'refresh'>>({
    data: null,
    fetchedAt: null,
    loading: enabled,
    error: null,
  })

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
          () => fetchUex<T>(resource, paramsRef.current ?? undefined, { fetchFn, limiter }),
          store,
          Date.now,
          force,
        )
        if (isActive()) setState({ data: r.data, fetchedAt: r.fetchedAt, loading: false, error: r.error ?? null })
      } catch (e) {
        if (isActive()) setState((s) => ({ ...s, loading: false, error: e instanceof UexError ? e.code : 'unknown' }))
      }
    },
    [key, resource, ttlMs, enabled, store, fetchFn, limiter],
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

  return useMemo(() => ({ ...state, refresh }), [state, refresh])
}

export function useUex<T>(resource: UexResource): UexState<T> {
  return useUexBase<T>(resource, undefined, TTL_MS[resource], true)
}

/** Consulta com parâmetros (ex.: itens de uma categoria). `params === null` não busca nada. */
export function useUexQuery<T>(resource: string, params: Record<string, string | number> | null, ttlMs: number): UexState<T> {
  return useUexBase<T>(resource, params, ttlMs, params !== null)
}

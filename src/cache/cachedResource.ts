import { UexError } from '../api/uexClient'
import type { KVStore } from './store'

export interface CacheResult<T> {
  data: T
  fetchedAt: number
  fromCache: boolean
  error?: string
}

interface Entry<T> {
  data: T
  fetchedAt: number
}

function isEntry<T>(v: unknown): v is Entry<T> {
  return typeof v === 'object' && v !== null && 'data' in v && typeof (v as Entry<T>).fetchedAt === 'number'
}

export async function peekResource<T>(key: string, store: KVStore): Promise<CacheResult<T> | null> {
  let raw: unknown
  try {
    raw = await store.get(key)
  } catch {
    return null
  }
  return isEntry<T>(raw) ? { data: raw.data, fetchedAt: raw.fetchedAt, fromCache: true } : null
}

/** Buscas em andamento por store/chave: telas que pedem o mesmo recurso ao mesmo tempo compartilham a busca. */
const inFlight = new WeakMap<KVStore, Map<string, Promise<Entry<unknown>>>>()

function fetchOnce<T>(key: string, fetcher: () => Promise<T>, store: KVStore, now: () => number): Promise<Entry<T>> {
  let byKey = inFlight.get(store)
  if (!byKey) inFlight.set(store, (byKey = new Map()))
  const running = byKey.get(key)
  if (running) return running as Promise<Entry<T>>
  const p = (async () => {
    const data = await fetcher()
    const fetchedAt = now()
    try {
      await store.set(key, { data, fetchedAt })
    } catch {
      // cache indisponível: segue só com o dado em memória
    }
    return { data, fetchedAt }
  })().finally(() => byKey!.delete(key))
  byKey.set(key, p)
  return p
}

/**
 * Devolve o recurso do cache se ainda estiver no prazo; senão busca e grava.
 * Se a busca falhar e houver cache (mesmo vencido), devolve o cache com `error`.
 */
export async function getResource<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
  store: KVStore,
  now: () => number = Date.now,
  force = false,
): Promise<CacheResult<T>> {
  const cached = await peekResource<T>(key, store)
  if (cached && !force && now() - cached.fetchedAt < ttlMs) return cached

  try {
    const { data, fetchedAt } = await fetchOnce(key, fetcher, store, now)
    return { data, fetchedAt, fromCache: false }
  } catch (e) {
    if (!cached) throw e
    const error = e instanceof UexError ? e.code : 'unknown'
    return { ...cached, error }
  }
}

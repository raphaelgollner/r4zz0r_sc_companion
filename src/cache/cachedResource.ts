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
    }
    return { data, fetchedAt }
  })().finally(() => byKey!.delete(key))
  byKey.set(key, p)
  return p
}

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

import { clear, createStore, get, set } from 'idb-keyval'

export interface KVStore {
  get(key: string): Promise<unknown>
  set(key: string, value: unknown): Promise<void>
  clear(): Promise<void>
}

export function memoryStore(): KVStore {
  const map = new Map<string, unknown>()
  return {
    get: async (key) => map.get(key),
    set: async (key, value) => {
      map.set(key, value)
    },
    clear: async () => map.clear(),
  }
}

export function idbStore(): KVStore {
  const db = createStore('tayko-companion', 'uex-cache')
  return {
    get: (key) => get(key, db),
    set: (key, value) => set(key, value, db),
    clear: () => clear(db),
  }
}

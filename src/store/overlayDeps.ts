import { createStore, get, set } from 'idb-keyval'
import type { KVStore } from '../cache/store'
import type { LogTail } from '../domain/overlay'
import { defaultImportDeps } from '../features/progress/importService'

export interface LiveDeps {
  getDir: () => Promise<string | null>
  tail: (dir: string, offset: number | null) => Promise<LogTail>
  pollMs?: number
}

export function overlayStore(): KVStore {
  const db = createStore('tayko-companion-overlay', 'overlay')
  return { get: (k) => get(k, db), set: (k, v) => set(k, v, db), clear: async () => {} }
}

export const defaultLiveDeps: LiveDeps = {
  getDir: async () => (await defaultImportDeps.load().catch(() => undefined))?.dir ?? (await defaultImportDeps.findDir().catch(() => null)),
  tail: async (dir, offset) => {
    const { invoke } = await import('@tauri-apps/api/core')
    return invoke<LogTail>('read_game_log_tail', { dir, offset })
  },
}

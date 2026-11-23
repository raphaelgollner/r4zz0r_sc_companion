import { createStore, del, get, set } from 'idb-keyval'
import { fetchWiki } from '../../api/wikiClient'
import type { RawLogFile } from '../../domain/gamelog'
import { EMPTY_IMPORT, type ImportData } from '../../domain/gamelog'

export const DEFAULT_GAME_DIR = 'C:\\Program Files\\Roberts Space Industries\\StarCitizen\\LIVE'

export interface SavedImport {
  data: ImportData
  names: Record<string, string>
  dir: string | null
}

export const EMPTY_SAVED: SavedImport = { data: EMPTY_IMPORT, names: {}, dir: null }

export interface ImportDeps {
  load: () => Promise<SavedImport | undefined>
  save: (v: SavedImport) => Promise<void>
  remove: () => Promise<void>
  findDir: () => Promise<string | null>
  pickDir: (start: string) => Promise<string | null>
  read: (dir: string) => Promise<RawLogFile[]>
  resolveName: (guid: string) => Promise<string | null>
}

const isTauri = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
const KEY = 'import'
let db: ReturnType<typeof createStore> | null = null
const store = () => (db ??= createStore('tayko-companion-import', 'import'))

export const defaultImportDeps: ImportDeps = {
  load: () => get(KEY, store()),
  save: (v) => set(KEY, v, store()),
  remove: () => del(KEY, store()),
  findDir: async () => {
    if (!isTauri()) return null
    const { invoke } = await import('@tauri-apps/api/core')
    return invoke<string | null>('find_game_dir')
  },
  pickDir: async (start) => {
    if (!isTauri()) return null
    const { open } = await import('@tauri-apps/plugin-dialog')
    const r = await open({ directory: true, multiple: false, defaultPath: start })
    return typeof r === 'string' ? r : null
  },
  read: async (dir) => {
    const { invoke } = await import('@tauri-apps/api/core')
    return invoke<RawLogFile[]>('read_game_logs', { dir })
  },
  resolveName: async (guid) => {
    try {
      const d = await fetchWiki<{ name?: string }>(`commodities/${encodeURIComponent(guid)}`)
      return typeof d?.name === 'string' && d.name ? d.name : null
    } catch {
      return null
    }
  },
}

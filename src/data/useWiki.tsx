import { fetchWiki, fetchWikiItemsByType } from '../api/wikiClient'
import { normalizeItem, normalizeVehicle, type WikiItem, type WikiVehicle } from '../domain/wiki'
import { WIKI_TTL } from './ttl'
import { useCachedQuery, type UexState } from './useUex'

export function useWikiVehicle(uuid: string | null): UexState<WikiVehicle> {
  return useCachedQuery<WikiVehicle>(
    `wiki:vehicle:${uuid ?? ''}`,
    async (deps) => normalizeVehicle(await fetchWiki<unknown>(`vehicles/${encodeURIComponent(uuid!)}`, deps)),
    WIKI_TTL,
    !!uuid,
  )
}

export function useWikiItems(type: string | null): UexState<WikiItem[]> {
  return useCachedQuery<WikiItem[]>(
    `wiki:items:${type ?? ''}`,
    async (deps) => (await fetchWikiItemsByType(type!, deps)).map(normalizeItem).filter((i) => i.uuid),
    WIKI_TTL,
    !!type,
  )
}

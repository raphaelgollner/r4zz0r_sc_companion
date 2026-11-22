import { createRateLimiter } from './rateLimiter'
import { UexError, type UexDeps } from './uexClient'

export const WIKI_BASE = 'https://api.star-citizen.wiki/api/v2'

const REQUEST_TIMEOUT_MS = 20_000
const MAX_PAGES = 20

const defaultLimiter = createRateLimiter({ maxPerWindow: 60, windowMs: 60_000 })

interface Page<T> {
  data?: T
  links?: { next?: string | null }
}

async function fetchPage<T>(path: string, deps: UexDeps): Promise<Page<T>> {
  const fetchFn = deps.fetchFn ?? fetch
  const limiter = deps.limiter ?? defaultLimiter
  return limiter.schedule(async () => {
    let res: Response
    try {
      res = await fetchFn(`${WIKI_BASE}/${path}`, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS), headers: { Accept: 'application/json' } })
    } catch (e) {
      const name = e instanceof Error || e instanceof DOMException ? e.name : ''
      if (name === 'TimeoutError' || name === 'AbortError') throw new UexError('timeout')
      throw new UexError('network', e instanceof Error ? e.message : String(e))
    }
    if (!res.ok) throw new UexError(`http_${res.status}`)
    let body: Page<T>
    try {
      body = await res.json()
    } catch {
      throw new UexError('invalid_json')
    }
    if (!body || body.data === null || typeof body.data !== 'object') throw new UexError('invalid_data')
    return body
  })
}

export async function fetchWiki<T>(path: string, deps: UexDeps = {}): Promise<T> {
  return (await fetchPage<T>(path, deps)).data as T
}

export async function fetchWikiItemsByType(type: string, deps: UexDeps = {}): Promise<unknown[]> {
  const out: unknown[] = []
  for (let page = 1; page <= MAX_PAGES; page++) {
    const body = await fetchPage<unknown[]>(`items?filter%5Btype%5D=${encodeURIComponent(type)}&limit=100&page%5Bnumber%5D=${page}`, deps)
    if (Array.isArray(body.data)) out.push(...body.data)
    if (!body.links?.next) break
  }
  return out
}

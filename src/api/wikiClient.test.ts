import { describe, expect, test } from 'vitest'
import { createRateLimiter } from './rateLimiter'
import { UexError } from './uexClient'
import { fetchWiki, fetchWikiItemsByType, WIKI_BASE } from './wikiClient'

const limiter = createRateLimiter({ maxPerWindow: 1000, windowMs: 1 })
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

describe('fetchWiki', () => {
  test('monta a URL e devolve data', async () => {
    const urls: string[] = []
    const fetchFn = (async (u: string) => (urls.push(u), json({ data: { name: 'Mole' } }))) as unknown as typeof fetch
    expect(await fetchWiki<{ name: string }>('vehicles/abc-123', { fetchFn, limiter })).toEqual({ name: 'Mole' })
    expect(urls).toEqual([`${WIKI_BASE}/vehicles/abc-123`])
  })

  test('404 vira http_404', async () => {
    const fetchFn = (async () => json({ message: 'nope' }, 404)) as unknown as typeof fetch
    await expect(fetchWiki('vehicles/x', { fetchFn, limiter })).rejects.toEqual(new UexError('http_404'))
  })

  test('sem data vira invalid_data', async () => {
    const fetchFn = (async () => json({ foo: 1 })) as unknown as typeof fetch
    await expect(fetchWiki('vehicles/x', { fetchFn, limiter })).rejects.toMatchObject({ code: 'invalid_data' })
  })

  test('falha de rede vira network', async () => {
    const fetchFn = (async () => {
      throw new TypeError('Failed to fetch')
    }) as unknown as typeof fetch
    await expect(fetchWiki('vehicles/x', { fetchFn, limiter })).rejects.toMatchObject({ code: 'network' })
  })
})

describe('fetchWikiItemsByType', () => {
  test('junta as páginas até não haver próxima', async () => {
    const urls: string[] = []
    const fetchFn = (async (u: string) => {
      urls.push(u)
      return u.includes('page%5Bnumber%5D=2')
        ? json({ data: [{ uuid: 'b' }], links: { next: null } })
        : json({ data: [{ uuid: 'a' }], links: { next: 'https://x/next' } })
    }) as unknown as typeof fetch
    const items = await fetchWikiItemsByType('MiningModifier', { fetchFn, limiter })
    expect(items).toEqual([{ uuid: 'a' }, { uuid: 'b' }])
    expect(urls[0]).toBe(`${WIKI_BASE}/items?filter%5Btype%5D=MiningModifier&limit=100&page%5Bnumber%5D=1`)
  })
})

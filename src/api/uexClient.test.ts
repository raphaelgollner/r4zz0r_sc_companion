import { describe, expect, test, vi } from 'vitest'
import { createRateLimiter } from './rateLimiter'
import { fetchUex, UexError } from './uexClient'

const limiter = createRateLimiter({ maxPerWindow: 1000, windowMs: 1 })

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('fetchUex', () => {
  test('monta URL com parâmetros e devolve data', async () => {
    const fetchFn = vi.fn(async () => jsonResponse({ status: 'ok', data: [{ id: 1 }] }))
    const data = await fetchUex<{ id: number }[]>('commodities_prices', { id_commodity: 47 }, { fetchFn, limiter })
    expect(fetchFn).toHaveBeenCalledWith('https://api.uexcorp.uk/2.0/commodities_prices/?id_commodity=47', expect.objectContaining({ signal: expect.any(AbortSignal) }))
    expect(data).toEqual([{ id: 1 }])
  })

  test('sem parâmetros usa a URL do recurso', async () => {
    const fetchFn = vi.fn(async () => jsonResponse({ status: 'ok', data: [] }))
    await fetchUex('commodities', undefined, { fetchFn, limiter })
    expect(fetchFn).toHaveBeenCalledWith('https://api.uexcorp.uk/2.0/commodities/', expect.anything())
  })

  test('status diferente de ok lança UexError com code', async () => {
    const fetchFn = vi.fn(async () => jsonResponse({ status: 'requests_limit_reached' }))
    await expect(fetchUex('commodities', undefined, { fetchFn, limiter })).rejects.toMatchObject({
      name: 'UexError',
      code: 'requests_limit_reached',
    })
  })

  test('HTTP 500 lança UexError http_500', async () => {
    const fetchFn = vi.fn(async () => new Response('erro', { status: 500 }))
    const err = (await fetchUex('commodities', undefined, { fetchFn, limiter }).catch((e) => e)) as UexError
    expect(err).toBeInstanceOf(UexError)
    expect(err.code).toBe('http_500')
  })

  test('falha de rede lança UexError network', async () => {
    const fetchFn = vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    })
    const err = (await fetchUex('commodities', undefined, { fetchFn, limiter }).catch((e) => e)) as UexError
    expect(err).toBeInstanceOf(UexError)
    expect(err.code).toBe('network')
  })

  test('status ok sem data lança UexError invalid_data', async () => {
    const fetchFn = vi.fn(async () => jsonResponse({ status: 'ok' }))
    await expect(fetchUex('commodities', undefined, { fetchFn, limiter })).rejects.toMatchObject({ code: 'invalid_data' })
    const fetchNull = vi.fn(async () => jsonResponse({ status: 'ok', data: null }))
    await expect(fetchUex('commodities', undefined, { fetchFn: fetchNull, limiter })).rejects.toMatchObject({ code: 'invalid_data' })
  })

  test('requisição que estoura o tempo lança UexError timeout', async () => {
    const fetchFn = vi.fn(async () => {
      throw new DOMException('signal timed out', 'TimeoutError')
    })
    await expect(fetchUex('commodities', undefined, { fetchFn, limiter })).rejects.toMatchObject({ code: 'timeout' })
  })
})

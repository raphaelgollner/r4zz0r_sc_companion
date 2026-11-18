import { describe, expect, test, vi } from 'vitest'
import { UexError } from '../api/uexClient'
import { getResource, peekResource } from './cachedResource'
import { memoryStore } from './store'

describe('getResource', () => {
  test('cache válido não chama a API', async () => {
    const store = memoryStore()
    await getResource('k', 1000, async () => 'v1', store, () => 0)
    const fetcher = vi.fn(async () => 'v2')
    const r = await getResource('k', 1000, fetcher, store, () => 500)
    expect(fetcher).not.toHaveBeenCalled()
    expect(r).toEqual({ data: 'v1', fetchedAt: 0, fromCache: true })
  })

  test('cache vencido busca de novo e grava', async () => {
    const store = memoryStore()
    await getResource('k', 1000, async () => 'v1', store, () => 0)
    const r = await getResource('k', 1000, async () => 'v2', store, () => 1500)
    expect(r).toEqual({ data: 'v2', fetchedAt: 1500, fromCache: false })
    expect(await peekResource('k', store)).toMatchObject({ data: 'v2', fetchedAt: 1500 })
  })

  test('force ignora TTL', async () => {
    const store = memoryStore()
    await getResource('k', 1000, async () => 'v1', store, () => 0)
    const r = await getResource('k', 1000, async () => 'v2', store, () => 10, true)
    expect(r.data).toBe('v2')
  })

  test('falha com cache existente devolve cache + error', async () => {
    const store = memoryStore()
    await getResource('k', 1000, async () => 'antigo', store, () => 0)
    const r = await getResource(
      'k',
      1000,
      async () => {
        throw new UexError('requests_limit_reached')
      },
      store,
      () => 5000,
    )
    expect(r).toEqual({ data: 'antigo', fetchedAt: 0, fromCache: true, error: 'requests_limit_reached' })
  })

  test('falha sem cache rejeita', async () => {
    const store = memoryStore()
    await expect(
      getResource('k', 1000, async () => {
        throw new UexError('network')
      }, store),
    ).rejects.toMatchObject({ code: 'network' })
  })

  test('peekResource sem nada gravado devolve null', async () => {
    expect(await peekResource('nada', memoryStore())).toBeNull()
  })

  test('chamadas simultâneas para o mesmo recurso fazem uma só busca', async () => {
    const store = memoryStore()
    let resolve!: (v: string) => void
    const fetcher = vi.fn(() => new Promise<string>((r) => (resolve = r)))
    const a = getResource('k', 1000, fetcher, store, () => 0)
    const b = getResource('k', 1000, fetcher, store, () => 0)
    await new Promise((r) => setTimeout(r, 0))
    resolve('v')
    expect((await a).data).toBe('v')
    expect((await b).data).toBe('v')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})

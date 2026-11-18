import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { createRateLimiter } from '../api/rateLimiter'
import { memoryStore } from '../cache/store'
import { UexProvider, useUex } from './useUex'

const limiter = createRateLimiter({ maxPerWindow: 1000, windowMs: 1 })

function wrapper(fetchFn: typeof fetch, store = memoryStore()) {
  return ({ children }: { children: ReactNode }) => (
    <UexProvider value={{ store, fetchFn, limiter }}>{children}</UexProvider>
  )
}

describe('useUex', () => {
  test('carrega o recurso da API', async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ status: 'ok', data: [{ id: 1 }] })))
    const { result } = renderHook(() => useUex<{ id: number }[]>('commodities'), { wrapper: wrapper(fetchFn) })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toEqual([{ id: 1 }])
    expect(result.current.error).toBeNull()
    expect(result.current.fetchedAt).toEqual(expect.any(Number))
  })

  test('sem cache e sem rede mostra erro', async () => {
    const fetchFn = vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    })
    const { result } = renderHook(() => useUex('commodities'), { wrapper: wrapper(fetchFn) })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toBeNull()
    expect(result.current.error).toBe('network')
  })

  test('com cache e sem rede mostra o cache e o erro', async () => {
    const store = memoryStore()
    await store.set('commodities', { data: ['velho'], fetchedAt: 0 })
    const fetchFn = vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    })
    const { result } = renderHook(() => useUex<string[]>('commodities'), { wrapper: wrapper(fetchFn, store) })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toEqual(['velho'])
    expect(result.current.error).toBe('network')
  })
})

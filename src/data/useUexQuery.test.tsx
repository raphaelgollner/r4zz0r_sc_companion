import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { createRateLimiter } from '../api/rateLimiter'
import { memoryStore } from '../cache/store'
import { UexProvider, useUexQuery } from './useUex'

const limiter = createRateLimiter({ maxPerWindow: 1000, windowMs: 1 })
const ok = (data: unknown) => new Response(JSON.stringify({ status: 'ok', data }))

function setup() {
  const store = memoryStore()
  const fetchFn = vi.fn(async () => ok([{ id: 1 }]))
  const wrapper = ({ children }: { children: ReactNode }) => <UexProvider value={{ store, fetchFn, limiter }}>{children}</UexProvider>
  return { store, fetchFn, wrapper }
}

describe('useUexQuery', () => {
  test('busca com parâmetros e grava numa chave própria', async () => {
    const { store, fetchFn, wrapper } = setup()
    const { result } = renderHook(() => useUexQuery<{ id: number }[]>('items', { id_category: 29 }, 1000), { wrapper })
    await waitFor(() => expect(result.current.data).toEqual([{ id: 1 }]))
    expect(fetchFn).toHaveBeenCalledWith('https://api.uexcorp.uk/2.0/items/?id_category=29', expect.anything())
    expect(await store.get('items?id_category=29')).toMatchObject({ data: [{ id: 1 }] })
  })

  test('mesmos parâmetros em outra ordem usam a mesma chave', async () => {
    const { store, wrapper } = setup()
    const a = renderHook(() => useUexQuery('terminals_distances', { id_terminal_origin: 1, id_terminal_destination: 2 }, 1000), { wrapper })
    await waitFor(() => expect(a.result.current.loading).toBe(false))
    expect(await store.get('terminals_distances?id_terminal_destination=2&id_terminal_origin=1')).toBeTruthy()
  })

  test('params null não busca', async () => {
    const { fetchFn, wrapper } = setup()
    const { result } = renderHook(() => useUexQuery('items', null, 1000), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toBeNull()
    expect(fetchFn).not.toHaveBeenCalled()
  })
})

describe('troca de parâmetros', () => {
  test('não mostra dados da consulta anterior quando a nova falha', async () => {
    const store = memoryStore()
    const fetchFn = vi.fn(async (url: string) =>
      url.includes('id_category=29') ? ok([{ id: 'laser' }]) : Promise.reject(new TypeError('offline')),
    ) as unknown as typeof fetch
    const wrapper = ({ children }: { children: ReactNode }) => <UexProvider value={{ store, fetchFn, limiter }}>{children}</UexProvider>
    const { result, rerender } = renderHook(({ cat }) => useUexQuery<{ id: string }[]>('items', { id_category: cat }, 1000), {
      wrapper,
      initialProps: { cat: 29 },
    })
    await waitFor(() => expect(result.current.data).toEqual([{ id: 'laser' }]))
    rerender({ cat: 30 })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toBeNull()
    expect(result.current.error).toBe('network')
  })
})

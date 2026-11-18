import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, test } from 'vitest'
import { memoryStore, type KVStore } from '../cache/store'
import { FleetProvider, useFleet } from './fleet'

const wrap = (store: KVStore) => ({ children }: { children: ReactNode }) => <FleetProvider store={store}>{children}</FleetProvider>

describe('useFleet', () => {
  test('a mesma nave duas vezes vira duas entradas', async () => {
    const { result } = renderHook(() => useFleet(), { wrapper: wrap(memoryStore()) })
    await waitFor(() => expect(result.current.ready).toBe(true))
    let a = '', b = ''
    act(() => {
      a = result.current.add(7)
    })
    act(() => {
      b = result.current.add(7)
    })
    expect(a).not.toBe(b)
    expect(result.current.entries.map((e) => e.vehicleId)).toEqual([7, 7])
  })

  test('update e remove gravam e outro provider lê de volta', async () => {
    const store = memoryStore()
    const first = renderHook(() => useFleet(), { wrapper: wrap(store) })
    await waitFor(() => expect(first.result.current.ready).toBe(true))
    let id = ''
    act(() => {
      id = first.result.current.add(7)
      first.result.current.add(8)
    })
    act(() => first.result.current.update(id, { nickname: 'Pedreira' }))
    const other = first.result.current.entries.find((e) => e.vehicleId === 8)!.id
    act(() => first.result.current.remove(other))
    first.unmount()

    const second = renderHook(() => useFleet(), { wrapper: wrap(store) })
    await waitFor(() => expect(second.result.current.ready).toBe(true))
    expect(second.result.current.entries).toHaveLength(1)
    expect(second.result.current.entries[0]).toMatchObject({ vehicleId: 7, nickname: 'Pedreira', setup: {} })
  })

  test('leitura que falha: nada é gravado', async () => {
    const writes: unknown[] = []
    const store: KVStore = { get: () => Promise.reject(new Error('x')), set: async (_k, v) => void writes.push(v), clear: async () => {} }
    const { result, unmount } = renderHook(() => useFleet(), { wrapper: wrap(store) })
    await waitFor(() => expect(result.current.loadFailed).toBe(true))
    act(() => void result.current.add(7))
    unmount()
    expect(writes).toEqual([])
  })

  test('dado salvo malformado vira lista vazia', async () => {
    const store = memoryStore()
    await store.set('data', { entries: 'nope' })
    const { result } = renderHook(() => useFleet(), { wrapper: wrap(store) })
    await waitFor(() => expect(result.current.ready).toBe(true))
    expect(result.current.entries).toEqual([])
  })

  test('sem provider: lista vazia, sem erro', () => {
    const { result } = renderHook(() => useFleet())
    expect(result.current.entries).toEqual([])
  })
})

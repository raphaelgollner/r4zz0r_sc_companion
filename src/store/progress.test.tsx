import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { memoryStore } from '../cache/store'
import { addTx, startSession } from '../domain/progress'
import { ProgressProvider, useProgress } from './progress'

describe('useProgress', () => {
  test('grava e outro provider com o mesmo store lê de volta, com sessão ativa', async () => {
    const store = memoryStore()
    const wrapper = ({ children }: { children: ReactNode }) => <ProgressProvider store={store}>{children}</ProgressProvider>

    const first = renderHook(() => useProgress(), { wrapper })
    await waitFor(() => expect(first.result.current.ready).toBe(true))
    act(() => first.result.current.apply((d) => addTx(startSession(d, 100, 's1'), { amount: 500, category: 'trade', description: 'x', at: 200 }, 't1')))
    await waitFor(() => expect(first.result.current.data.txs).toHaveLength(1))
    first.unmount()

    const second = renderHook(() => useProgress(), { wrapper })
    await waitFor(() => expect(second.result.current.ready).toBe(true))
    expect(second.result.current.data.txs[0]).toMatchObject({ id: 't1', sessionId: 's1' })
    expect(second.result.current.data.sessions[0].endedAt).toBeNull()
  })
})

describe('gravação com atraso', () => {
  afterEach(() => vi.useRealTimers())

  test('várias mudanças seguidas viram uma gravação', async () => {
    const store = memoryStore()
    const set = vi.spyOn(store, 'set')
    const wrapper = ({ children }: { children: ReactNode }) => <ProgressProvider store={store}>{children}</ProgressProvider>
    const { result } = renderHook(() => useProgress(), { wrapper })
    await waitFor(() => expect(result.current.ready).toBe(true))
    vi.useFakeTimers()
    act(() => {
      result.current.apply((d) => ({ ...d, profile: { ...d.profile, name: 'R' } }))
      result.current.apply((d) => ({ ...d, profile: { ...d.profile, name: 'Ra' } }))
      result.current.apply((d) => ({ ...d, profile: { ...d.profile, name: 'Rap' } }))
    })
    expect(set).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(400))
    expect(set).toHaveBeenCalledTimes(1)
    expect((set.mock.calls[0][1] as { profile: { name: string } }).profile.name).toBe('Rap')
  })

  test('fechar logo depois de digitar ainda grava', async () => {
    const store = memoryStore()
    const set = vi.spyOn(store, 'set')
    const wrapper = ({ children }: { children: ReactNode }) => <ProgressProvider store={store}>{children}</ProgressProvider>
    const { result, unmount } = renderHook(() => useProgress(), { wrapper })
    await waitFor(() => expect(result.current.ready).toBe(true))
    act(() => result.current.apply((d) => ({ ...d, profile: { ...d.profile, name: 'Rapha' } })))
    unmount()
    expect(set).toHaveBeenCalledTimes(1)
  })
})

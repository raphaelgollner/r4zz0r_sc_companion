import { act, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { memoryStore } from '../cache/store'
import type { LogTail } from '../domain/overlay'
import { OverlayProvider, useOverlay, type LiveDeps } from './overlay'

function Probe() {
  const o = useOverlay()
  const s = o.data.sessions[0]
  return (
    <div>
      <output data-testid="state">{JSON.stringify({ n: o.data.sessions.length, active: s?.endedAt === null, offset: s?.offset, lines: s?.lines.length, error: o.error })}</output>
      <button onClick={() => void o.start()}>start</button>
      <button onClick={() => o.end()}>end</button>
    </div>
  )
}
const state = () => JSON.parse(screen.getByTestId('state').textContent!)

function setup(over: Partial<LiveDeps> = {}) {
  const tails: LogTail[] = []
  const live: LiveDeps = {
    getDir: vi.fn(async () => 'C:\\SC\\LIVE'),
    tail: vi.fn(async (_d: string, offset: number | null) => (offset === null ? { first: 'f1', offset: 100, lines: [] } : (tails.shift() ?? { first: 'f1', offset: offset, lines: [] }))),
    pollMs: 20,
    ...over,
  }
  render(
    <OverlayProvider store={memoryStore()} live={live}>
      <Probe />
    </OverlayProvider>,
  )
  return { live, tails }
}

describe('OverlayProvider', () => {
  test('iniciar marca o fim atual do Game.log; a leitura periódica acrescenta as linhas novas', async () => {
    const { live, tails } = setup()
    await waitFor(() => expect(state().n).toBe(0))
    tails.push({ first: 'f1', offset: 180, lines: ['a', 'b'] })
    await act(async () => screen.getByText('start').click())
    await waitFor(() => expect(state()).toMatchObject({ active: true, offset: 180, lines: 2 }))
    expect(live.tail).toHaveBeenCalledWith('C:\\SC\\LIVE', null)
    expect(live.tail).toHaveBeenCalledWith('C:\\SC\\LIVE', 100)
  })

  test('Game.log novo (jogo reaberto): relê do começo do arquivo novo', async () => {
    const { live, tails } = setup()
    await waitFor(() => expect(state().n).toBe(0))
    tails.push({ first: 'f2', offset: 30, lines: [] }, { first: 'f2', offset: 60, lines: ['x'] })
    await act(async () => screen.getByText('start').click())
    await waitFor(() => expect(state()).toMatchObject({ offset: 60, lines: 1 }))
    expect(live.tail).toHaveBeenCalledWith('C:\\SC\\LIVE', 0)
  })

  test('sem pasta do jogo: avisa e não inicia', async () => {
    setup({ getDir: vi.fn(async () => null) })
    await waitFor(() => expect(state().n).toBe(0))
    await act(async () => screen.getByText('start').click())
    await waitFor(() => expect(state()).toMatchObject({ n: 0, error: 'noDir' }))
  })

  test('encerrar faz uma última leitura, segue lendo por 15 s (recusas do jogo) e depois para', async () => {
    const { live, tails } = setup()
    await waitFor(() => expect(state().n).toBe(0))
    await act(async () => screen.getByText('start').click())
    await waitFor(() => expect(state().active).toBe(true))
    tails.push({ first: 'f1', offset: 150, lines: ['z'] })
    await act(async () => screen.getByText('end').click())
    await waitFor(() => expect(state()).toMatchObject({ active: false, lines: 1 }))
    tails.push({ first: 'f1', offset: 190, lines: ['recusa do jogo'] })
    await waitFor(() => expect(state()).toMatchObject({ active: false, lines: 2 }))
    const realNow = Date.now()
    vi.spyOn(Date, 'now').mockReturnValue(realNow + 20_000)
    await act(() => new Promise((r) => setTimeout(r, 40)))
    const calls = (live.tail as ReturnType<typeof vi.fn>).mock.calls.length
    await act(() => new Promise((r) => setTimeout(r, 80)))
    expect((live.tail as ReturnType<typeof vi.fn>).mock.calls.length).toBe(calls)
    vi.restoreAllMocks()
  })
})

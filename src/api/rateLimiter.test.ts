import { describe, expect, test, vi } from 'vitest'
import { createRateLimiter } from './rateLimiter'

function fakeClock(start = 0) {
  let t = start
  return {
    now: () => t,
    sleep: vi.fn(async (ms: number) => {
      t += ms
    }),
  }
}

describe('createRateLimiter', () => {
  test('executa até o limite sem esperar', async () => {
    const clock = fakeClock()
    const limiter = createRateLimiter({ maxPerWindow: 3, windowMs: 60_000, ...clock })
    const results = await Promise.all([1, 2, 3].map((n) => limiter.schedule(async () => n)))
    expect(results).toEqual([1, 2, 3])
    expect(clock.sleep).not.toHaveBeenCalled()
  })

  test('a 4ª chamada espera o fim da janela', async () => {
    const clock = fakeClock()
    const limiter = createRateLimiter({ maxPerWindow: 3, windowMs: 60_000, ...clock })
    for (let i = 0; i < 4; i++) await limiter.schedule(async () => i)
    expect(clock.sleep).toHaveBeenCalledTimes(1)
    expect(clock.sleep).toHaveBeenCalledWith(60_000)
  })

  test('chamadas em paralelo acima do limite também esperam', async () => {
    const clock = fakeClock()
    const limiter = createRateLimiter({ maxPerWindow: 2, windowMs: 1_000, ...clock })
    await Promise.all([1, 2, 3, 4].map((n) => limiter.schedule(async () => n)))
    expect(clock.sleep).toHaveBeenCalled()
    expect(clock.now()).toBeGreaterThanOrEqual(1_000)
  })
})

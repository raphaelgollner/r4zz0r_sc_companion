export interface RateLimiter {
  schedule<T>(fn: () => Promise<T>): Promise<T>
}

interface RateLimiterOptions {
  maxPerWindow: number
  windowMs: number
  now?: () => number
  sleep?: (ms: number) => Promise<void>
}

const realSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** Janela deslizante: no máximo `maxPerWindow` chamadas iniciadas a cada `windowMs`. */
export function createRateLimiter({
  maxPerWindow,
  windowMs,
  now = Date.now,
  sleep = realSleep,
}: RateLimiterOptions): RateLimiter {
  const started: number[] = []
  // Fila de "vagas": cada chamada espera a anterior conseguir sua vaga antes de calcular a sua.
  let slotQueue: Promise<void> = Promise.resolve()

  async function takeSlot() {
    while (started.length > 0 && now() - started[0] >= windowMs) started.shift()
    if (started.length >= maxPerWindow) {
      const wait = started[0] + windowMs - now()
      if (wait > 0) await sleep(wait)
      while (started.length > 0 && now() - started[0] >= windowMs) started.shift()
      if (started.length >= maxPerWindow) started.shift()
    }
    started.push(now())
  }

  return {
    schedule<T>(fn: () => Promise<T>): Promise<T> {
      const slot = slotQueue.then(takeSlot)
      slotQueue = slot
      return slot.then(fn)
    },
  }
}

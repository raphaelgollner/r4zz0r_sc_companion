import { createRateLimiter, type RateLimiter } from './rateLimiter'

export const UEX_BASE = 'https://api.uexcorp.uk/2.0'

/** Erro da API do UEX. `code` é o `status` devolvido pela API, `http_<n>` ou `network`. */
export class UexError extends Error {
  code: string
  constructor(code: string, message?: string) {
    super(message ?? code)
    this.name = 'UexError'
    this.code = code
  }
}

/** Tempo máximo de uma requisição antes de desistir e mostrar "Tentar de novo". */
const REQUEST_TIMEOUT_MS = 20_000

const defaultLimiter = createRateLimiter({ maxPerWindow: 100, windowMs: 60_000 })

export interface UexDeps {
  fetchFn?: typeof fetch
  limiter?: RateLimiter
}

export function buildUexUrl(resource: string, params?: Record<string, string | number>): string {
  const query = params
    ? new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString()
    : ''
  return `${UEX_BASE}/${resource}/${query ? `?${query}` : ''}`
}

export async function fetchUex<T>(
  resource: string,
  params?: Record<string, string | number>,
  deps: UexDeps = {},
): Promise<T> {
  const fetchFn = deps.fetchFn ?? fetch
  const limiter = deps.limiter ?? defaultLimiter
  const url = buildUexUrl(resource, params)

  return limiter.schedule(async () => {
    let res: Response
    try {
      res = await fetchFn(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
    } catch (e) {
      const name = e instanceof Error || e instanceof DOMException ? e.name : ''
      if (name === 'TimeoutError' || name === 'AbortError') throw new UexError('timeout')
      throw new UexError('network', e instanceof Error ? e.message : String(e))
    }
    if (!res.ok) throw new UexError(`http_${res.status}`)
    let body: { status?: string; data?: T }
    try {
      body = await res.json()
    } catch {
      throw new UexError('invalid_json')
    }
    if (body.status !== 'ok') throw new UexError(body.status ?? 'unknown')
    // Resposta sem dados não pode ir para o cache: as telas esperam lista/objeto.
    if (body.data === null || typeof body.data !== 'object') throw new UexError('invalid_data')
    return body.data as T
  })
}

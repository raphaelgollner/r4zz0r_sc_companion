import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { createRateLimiter } from '../../api/rateLimiter'
import { memoryStore } from '../../cache/store'
import { UexProvider } from '../../data/useUex'
import { I18nProvider } from '../../i18n/i18n'
import { CurrenciesScreen } from './screens'

describe('botão Atualizar da tela', () => {
  test('força nova busca mesmo com cache válido', async () => {
    const fetchFn = vi.fn(async (url: string) =>
      new Response(JSON.stringify({ status: 'ok', data: url.includes('history') ? [] : [{ currency: 'UEC', index_value: 1, basket_value: 1, date_modified: 1, components: [] }] })),
    ) as unknown as typeof fetch
    render(
      <I18nProvider initial="pt">
        <UexProvider value={{ store: memoryStore(), fetchFn, limiter: createRateLimiter({ maxPerWindow: 1000, windowMs: 1 }) }}>
          <CurrenciesScreen />
        </UexProvider>
      </I18nProvider>,
    )
    const btn = await screen.findByRole('button', { name: 'Atualizar' })
    await waitFor(() => expect(btn).toBeEnabled())
    const before = (fetchFn as unknown as { mock: { calls: unknown[] } }).mock.calls.length
    await userEvent.click(btn)
    await waitFor(() => expect((fetchFn as unknown as { mock: { calls: unknown[] } }).mock.calls.length).toBeGreaterThan(before))
  })
})

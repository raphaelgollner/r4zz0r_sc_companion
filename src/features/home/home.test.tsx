import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { I18nProvider } from '../../i18n/i18n'
import { DEFAULT_PREFS } from '../../store/prefs'
import { GOLD, LARANITE, NOW, PRICES, terminal, vehicle } from '../../test/fixtures'
import { HomeView } from './HomeView'

const base = {
  vehicles: [vehicle(1, 'Caterpillar', 576)],
  commodities: [LARANITE, GOLD],
  prices: PRICES,
  terminals: [terminal(8), terminal(12), terminal(13)],
  now: NOW,
  cache: [{ resource: 'commodities', fetchedAt: NOW - 5 * 60_000 }, { resource: 'vehicles', fetchedAt: null }],
}

describe('HomeView', () => {
  test('sem nave salva mostra botão para configurar a calculadora', async () => {
    const onSetup = vi.fn()
    render(<I18nProvider initial="pt"><HomeView {...base} prefs={DEFAULT_PREFS} onSetup={onSetup} onRefreshAll={() => {}} /></I18nProvider>)
    await userEvent.click(screen.getByRole('button', { name: 'Configurar calculadora' }))
    expect(onSetup).toHaveBeenCalled()
  })

  test('com nave e orçamento mostra até 5 rotas', () => {
    render(<I18nProvider initial="pt"><HomeView {...base} prefs={{ ...DEFAULT_PREFS, shipId: 1, budget: 5_000_000 }} onSetup={() => {}} onRefreshAll={() => {}} /></I18nProvider>)
    const cards = screen.getAllByRole('article')
    expect(cards.length).toBeGreaterThan(0)
    expect(cards.length).toBeLessThanOrEqual(5)
  })

  test('painel de cache mostra idade e recurso não baixado; botão atualiza tudo', async () => {
    const onRefreshAll = vi.fn()
    render(<I18nProvider initial="pt"><HomeView {...base} prefs={DEFAULT_PREFS} onSetup={() => {}} onRefreshAll={onRefreshAll} /></I18nProvider>)
    expect(screen.getByRole('row', { name: /commodities/ })).toHaveTextContent('há 5 min')
    expect(screen.getByRole('row', { name: /vehicles/ })).toHaveTextContent('ainda não baixado')
    await userEvent.click(screen.getByRole('button', { name: 'Atualizar tudo' }))
    expect(onRefreshAll).toHaveBeenCalled()
  })
})

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test } from 'vitest'
import { createRateLimiter } from '../api/rateLimiter'
import { memoryStore } from '../cache/store'
import { UexProvider } from '../data/useUex'
import { I18nProvider } from '../i18n/i18n'
import App from './App'

const limiter = createRateLimiter({ maxPerWindow: 1000, windowMs: 1 })
const fetchFn = (async () => new Response(JSON.stringify({ status: 'ok', data: [] }))) as typeof fetch

function renderApp() {
  return render(
    <I18nProvider>
      <UexProvider value={{ store: memoryStore(), fetchFn, limiter }}>
        <App />
      </UexProvider>
    </I18nProvider>,
  )
}

describe('App', () => {
  beforeEach(() => localStorage.clear())

  test('mostra o título', () => {
    renderApp()
    expect(screen.getByRole('heading', { name: 'TAYKO CORP COMPANION' })).toBeInTheDocument()
  })

  test('TRADE mostra as 6 sub-abas', async () => {
    renderApp()
    await userEvent.click(screen.getByRole('tab', { name: 'TRADE' }))
    for (const name of ['Commodities', 'Locations', 'Harvestables', 'Price Finder', 'Routes', 'Currencies Index'])
      expect(screen.getByRole('tab', { name })).toBeInTheDocument()
  })

  test('MINERAÇÃO está desabilitada', () => {
    renderApp()
    expect(screen.getByRole('tab', { name: /MINERAÇÃO/ })).toBeDisabled()
  })

  test('rodapé credita o UEX', () => {
    renderApp()
    expect(screen.getByText(/Dados: UEX Corp/)).toBeInTheDocument()
  })

  test('trocar para EN traduz abas e rodapé', async () => {
    renderApp()
    await userEvent.click(screen.getByRole('button', { name: 'EN' }))
    expect(screen.getByRole('tab', { name: /SHIPS/ })).toBeInTheDocument()
    expect(screen.getByText(/Data: UEX Corp/)).toBeInTheDocument()
  })
})

describe('navegação pelo endereço', () => {
  test('#trade/finder abre TRADE › Price Finder', () => {
    window.location.hash = '#trade/finder'
    renderApp()
    expect(screen.getByRole('tab', { name: 'Price Finder' })).toHaveAttribute('aria-selected', 'true')
    window.location.hash = ''
  })
})

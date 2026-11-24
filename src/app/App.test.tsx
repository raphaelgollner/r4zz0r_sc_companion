import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
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
    const subs = screen.getAllByRole('tab').map((t) => t.textContent).slice(8)
    expect(subs).toEqual(['Routes', 'Commodities', 'Locations', 'Harvestables', 'Price Finder', 'Currencies Index'])
    expect(screen.getByRole('tab', { name: 'Routes' })).toHaveAttribute('aria-selected', 'true')
  })

  test('abas na ordem nova', () => {
    renderApp()
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['OVERLAY', 'INÍCIO', 'TRADE', 'MINERAÇÃO', 'SALVAGE', 'NAVES', 'FROTA', 'AJUSTES'])
  })

  test('SALVAGE e FROTA habilitadas', () => {
    renderApp()
    expect(screen.getByRole('tab', { name: 'SALVAGE' })).toBeEnabled()
    expect(screen.getByRole('tab', { name: 'FROTA' })).toBeEnabled()
  })

  test('#salvage/planner abre a subaba', () => {
    window.location.hash = '#salvage/planner'
    render(
      <I18nProvider>
        <UexProvider value={{ store: memoryStore(), fetchFn, limiter }}>
          <App screens={{ salvage: { planner: () => <p>PLAN</p> } }} />
        </UexProvider>
      </I18nProvider>,
    )
    expect(screen.getByText('PLAN')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Salvage Planner' })).toHaveAttribute('aria-selected', 'true')
    window.location.hash = ''
  })

  test('#progress antigo cai no INÍCIO, que mostra o progresso', () => {
    window.location.hash = '#progress'
    render(
      <I18nProvider>
        <UexProvider value={{ store: memoryStore(), fetchFn, limiter }}>
          <App screens={{ home: () => <p>INICIO</p> }} />
        </UexProvider>
      </I18nProvider>,
    )
    expect(screen.getByRole('tab', { name: 'INÍCIO' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('INICIO')).toBeInTheDocument()
    window.location.hash = ''
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

describe('aba INÍCIO', () => {
  test('existe em PT e EN', async () => {
    localStorage.clear()
    renderApp()
    expect(screen.getByRole('tab', { name: 'INÍCIO' })).toBeEnabled()
    await userEvent.click(screen.getByRole('button', { name: 'EN' }))
    expect(screen.getByRole('tab', { name: 'HOME' })).toBeInTheDocument()
  })
})

describe('link da org', () => {
  test('TAYKO.ORG no banner abre o site no navegador', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    renderApp()
    const link = screen.getByRole('button', { name: /TAYKO\.ORG/ })
    const lang = screen.getByRole('group', { name: 'Idioma / Language' })
    expect(link.compareDocumentPosition(lang) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    await userEvent.click(link)
    expect(open).toHaveBeenCalledWith('https://tayko.org', '_blank', 'noopener')
    open.mockRestore()
  })
})

describe('rodapé', () => {
  test('mostra o aviso de app não oficial e o crédito do desenvolvedor com link', async () => {
    localStorage.clear()
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    renderApp()
    const footer = screen.getByRole('contentinfo')
    expect(footer).toHaveTextContent('Star Citizen® é marca registrada da Cloud Imperium Games. App não oficial.')
    expect(footer).toHaveTextContent('Desenvolvido de forma independente por Raphael Gollner')
    await userEvent.click(within(footer).getByRole('button', { name: /raphaelgollner\.github\.io/ }))
    expect(open).toHaveBeenCalledWith('https://raphaelgollner.github.io/', '_blank', 'noopener')
    open.mockRestore()
  })
})

describe('aba OVERLAY', () => {
  test('fica à esquerda do INÍCIO, com subabas REGISTRO e IMPORTAÇÃO; INÍCIO não tem subabas', async () => {
    localStorage.clear()
    window.location.hash = ''
    render(
      <I18nProvider>
        <UexProvider value={{ store: memoryStore(), fetchFn, limiter }}>
          <App screens={{ home: () => <p>MANUAL</p>, overlay: { record: () => <p>AO VIVO</p>, settings: () => <p>BRUTO</p> } }} />
        </UexProvider>
      </I18nProvider>,
    )
    const main = screen.getAllByRole('tab').map((x) => x.textContent)
    expect(main.slice(0, 2)).toEqual(['OVERLAY', 'INÍCIO'])
    expect(screen.getByText('MANUAL')).toBeInTheDocument()
    expect(screen.getAllByRole('tablist')).toHaveLength(1)
    await userEvent.click(screen.getByRole('tab', { name: 'OVERLAY' }))
    expect(screen.getByText('AO VIVO')).toBeInTheDocument()
    const sub = screen.getAllByRole('tablist')[1]
    expect(within(sub).getAllByRole('tab').map((x) => x.textContent)).toEqual(['REGISTRO', 'IMPORTAÇÃO'])
    await userEvent.click(within(sub).getByRole('tab', { name: 'IMPORTAÇÃO' }))
    expect(screen.getByText('BRUTO')).toBeInTheDocument()
  })
})

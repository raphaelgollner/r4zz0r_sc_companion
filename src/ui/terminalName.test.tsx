import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { I18nProvider } from '../i18n/i18n'
import { TerminalsContext } from '../data/terminals'
import { terminal } from '../test/fixtures'
import { TerminalName } from './TerminalName'
import { Tooltip } from './Tooltip'

const map = new Map([[1, terminal(1, { star_system_name: 'Stanton', planet_name: 'ArcCorp', space_station_name: 'ARC-L1 Wide Forest Station' })]])
const renderName = (id: number) =>
  render(
    <I18nProvider initial="pt"><TerminalsContext.Provider value={map}>
      <TerminalName id={id} fallback="ARC-L1" />
    </TerminalsContext.Provider></I18nProvider>,
  )

describe('TerminalName', () => {
  test('lugar que já começa com o nome do terminal aparece uma vez só', () => {
    renderName(1)
    expect(screen.getByText('ARC-L1 Wide Forest Station')).toBeInTheDocument()
    expect(screen.queryByText('ARC-L1')).toBeNull()
  })

  test('lugar diferente aparece ao lado do terminal', () => {
    render(
      <I18nProvider initial="pt"><TerminalsContext.Provider value={new Map([[2, terminal(2, { planet_name: 'Hurston', city_name: 'Lorville' })]])}>
        <TerminalName id={2} fallback="TDD" />
      </TerminalsContext.Provider></I18nProvider>,
    )
    expect(screen.getByText('TDD')).toBeInTheDocument()
    expect(screen.getByText('Lorville')).toBeInTheDocument()
  })

  test('hover mostra o caminho', async () => {
    renderName(1)
    await userEvent.hover(screen.getByText('ARC-L1 Wide Forest Station'))
    expect(screen.getByRole('tooltip')).toHaveTextContent('Stanton › ArcCorp › ARC-L1 Wide Forest Station')
    await userEvent.unhover(screen.getByText('ARC-L1 Wide Forest Station'))
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  test('Tooltip focável mostra a dica pelo teclado', async () => {
    render(
      <Tooltip content="dica" focusable>
        <span>alvo</span>
      </Tooltip>,
    )
    await userEvent.tab()
    expect(screen.getByRole('tooltip')).toHaveTextContent('dica')
  })

  test('terminal desconhecido mostra só o nome, sem tooltip', async () => {
    renderName(999)
    expect(screen.getByText('ARC-L1')).toBeInTheDocument()
    await userEvent.hover(screen.getByText('ARC-L1'))
    expect(screen.queryByRole('tooltip')).toBeNull()
  })
})

describe('foco do teclado', () => {
  test('TerminalName só cria a parada de Tab do botão copiar', async () => {
    render(
      <I18nProvider initial="pt"><TerminalsContext.Provider value={map}>
        <button>antes</button>
        <TerminalName id={1} fallback="ARC-L1" />
        <button>depois</button>
      </TerminalsContext.Provider></I18nProvider>,
    )
    await userEvent.tab()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: /Copiar destino/ })).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'depois' })).toHaveFocus()
  })
})

describe('copiar destino', () => {
  const withClipboard = (writeText: ReturnType<typeof vi.fn>) => Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
  const renderT = (m: Map<number, ReturnType<typeof terminal>>, id: number, fallback: string) =>
    render(
      <I18nProvider initial="pt">
        <TerminalsContext.Provider value={m}>
          <TerminalName id={id} fallback={fallback} />
        </TerminalsContext.Provider>
      </I18nProvider>,
    )

  test('copia o nome do local', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    withClipboard(writeText)
    renderT(new Map([[5, terminal(5, { space_station_name: 'Port Tressler' })]]), 5, 'TDD Port Tressler')
    fireEvent.click(screen.getByRole('button', { name: 'Copiar destino: Port Tressler' }))
    expect(writeText).toHaveBeenCalledWith('Port Tressler')
    expect(await screen.findByText('Copiado')).toBeInTheDocument()
  })

  test('sem local, copia o nome do terminal', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    withClipboard(writeText)
    renderT(new Map(), 9, 'Some Terminal')
    fireEvent.click(screen.getByRole('button', { name: 'Copiar destino: Some Terminal' }))
    expect(writeText).toHaveBeenCalledWith('Some Terminal')
  })

  test('falha ao copiar', async () => {
    withClipboard(vi.fn().mockRejectedValue(new Error('no')))
    renderT(new Map([[5, terminal(5, { space_station_name: 'Port Tressler' })]]), 5, 'TDD')
    fireEvent.click(screen.getByRole('button', { name: /Copiar destino/ }))
    expect(await screen.findByText('Não foi possível copiar')).toBeInTheDocument()
  })

  test('mostra o nível de perigo estimado com o aviso', () => {
    render(
      <I18nProvider initial="pt"><TerminalsContext.Provider value={new Map([[3, terminal(3, { city_name: 'Lorville', faction_name: 'United Empire of Earth' })]])}>
        <TerminalName id={3} fallback="TDD" />
      </TerminalsContext.Provider></I18nProvider>,
    )
    const badge = screen.getByText('SEGURO')
    expect(badge).toHaveClass('risk-safe')
    expect(badge.getAttribute('title')).toMatch(/United Empire of Earth.*Pode não representar/)
  })

  test('terminal desconhecido não mostra nível', () => {
    render(<I18nProvider initial="pt"><TerminalName id={99} fallback="X" /></I18nProvider>)
    expect(screen.queryByText(/SEGURO|MEDIANO|ARRISCADO|PERIGOSO/)).toBeNull()
  })
})

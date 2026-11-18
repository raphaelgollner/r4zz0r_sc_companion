import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test } from 'vitest'
import { TerminalsContext } from '../data/terminals'
import { terminal } from '../test/fixtures'
import { TerminalName } from './TerminalName'
import { Tooltip } from './Tooltip'

const map = new Map([[1, terminal(1, { star_system_name: 'Stanton', planet_name: 'ArcCorp', space_station_name: 'ARC-L1 Wide Forest Station' })]])
const renderName = (id: number) =>
  render(
    <TerminalsContext.Provider value={map}>
      <TerminalName id={id} fallback="ARC-L1" />
    </TerminalsContext.Provider>,
  )

describe('TerminalName', () => {
  test('lugar que já começa com o nome do terminal aparece uma vez só', () => {
    renderName(1)
    expect(screen.getByText('ARC-L1 Wide Forest Station')).toBeInTheDocument()
    expect(screen.queryByText('ARC-L1')).toBeNull()
  })

  test('lugar diferente aparece ao lado do terminal', () => {
    render(
      <TerminalsContext.Provider value={new Map([[2, terminal(2, { planet_name: 'Hurston', city_name: 'Lorville' })]])}>
        <TerminalName id={2} fallback="TDD" />
      </TerminalsContext.Provider>,
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
  test('TerminalName não cria parada de Tab por padrão', async () => {
    render(
      <TerminalsContext.Provider value={map}>
        <button>antes</button>
        <TerminalName id={1} fallback="ARC-L1" />
        <button>depois</button>
      </TerminalsContext.Provider>,
    )
    await userEvent.tab()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'depois' })).toHaveFocus()
  })
})

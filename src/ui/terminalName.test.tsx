import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test } from 'vitest'
import { TerminalsContext } from '../data/terminals'
import { terminal } from '../test/fixtures'
import { TerminalName } from './TerminalName'

const map = new Map([[1, terminal(1, { star_system_name: 'Stanton', planet_name: 'ArcCorp', space_station_name: 'ARC-L1 Wide Forest Station' })]])
const renderName = (id: number) =>
  render(
    <TerminalsContext.Provider value={map}>
      <TerminalName id={id} fallback="ARC-L1" />
    </TerminalsContext.Provider>,
  )

describe('TerminalName', () => {
  test('mostra terminal e lugar', () => {
    renderName(1)
    expect(screen.getByText('ARC-L1')).toBeInTheDocument()
    expect(screen.getByText('ARC-L1 Wide Forest Station')).toBeInTheDocument()
  })

  test('hover mostra o caminho', async () => {
    renderName(1)
    await userEvent.hover(screen.getByText('ARC-L1'))
    expect(screen.getByRole('tooltip')).toHaveTextContent('Stanton › ArcCorp › ARC-L1 Wide Forest Station')
    await userEvent.unhover(screen.getByText('ARC-L1'))
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  test('foco pelo teclado também mostra', async () => {
    renderName(1)
    await userEvent.tab()
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
  })

  test('terminal desconhecido mostra só o nome, sem tooltip', async () => {
    renderName(999)
    expect(screen.getByText('ARC-L1')).toBeInTheDocument()
    await userEvent.hover(screen.getByText('ARC-L1'))
    expect(screen.queryByRole('tooltip')).toBeNull()
  })
})

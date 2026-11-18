import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { TerminalsContext } from '../../data/terminals'
import type { PledgePrice, VehiclePrice } from '../../data/types'
import type { FleetEntry } from '../../domain/fleet'
import { I18nProvider } from '../../i18n/i18n'
import { DEFAULT_PREFS, type Prefs } from '../../store/prefs'
import { NOW, SEC, terminal, vehicle } from '../../test/fixtures'
import { FleetView } from './FleetView'

const vehicles = [
  vehicle(50, 'Prospector', 32, { name_full: 'MISC Prospector', company_name: 'Musashi Industrial', is_mining: 1, is_cargo: 0, crew: '1' }),
  vehicle(41, 'Caterpillar', 576, { name_full: 'Drake Caterpillar', company_name: 'Drake Interplanetary', crew: '1,5' }),
]
const pledge: PledgePrice[] = [{ id: 1, id_vehicle: 50, price: 155, currency: 'USD', date_modified: 1 }]
const purchases: VehiclePrice[] = [
  { id: 1, id_vehicle: 50, id_terminal: 3, price_buy: 3_297_600, date_modified: SEC - 3600, vehicle_name: 'Prospector', terminal_name: 'New Deal Lorville' },
  { id: 2, id_vehicle: 50, id_terminal: 4, price_buy: 3_500_000, date_modified: SEC - 3600, vehicle_name: 'Prospector', terminal_name: 'Astro Armada' },
]
const terminals = new Map([[3, terminal(3, { city_name: 'Lorville' })]])

function Harness({ initial = [], prefs = DEFAULT_PREFS, onOpenSetup = () => {}, loadFailed = false }: { initial?: FleetEntry[]; prefs?: Prefs; onOpenSetup?: (id: string) => void; loadFailed?: boolean }) {
  const [entries, setEntries] = useState<FleetEntry[]>(initial)
  let n = 0
  return (
    <I18nProvider initial="pt">
      <TerminalsContext.Provider value={terminals}>
        <FleetView
          entries={entries}
          vehicles={vehicles}
          pledge={pledge}
          purchases={purchases}
          rentals={[]}
          prefs={prefs}
          now={NOW}
          onAdd={(vehicleId) => setEntries((l) => [...l, { id: `n${l.length}${n++}`, vehicleId, nickname: '', note: '', addedAt: 0, setup: {} }])}
          onUpdate={(id, patch) => setEntries((l) => l.map((e) => (e.id === id ? { ...e, ...patch } : e)))}
          onRemove={(id) => setEntries((l) => l.filter((e) => e.id !== id))}
          onOpenSetup={onOpenSetup}
          loadFailed={loadFailed}
        />
      </TerminalsContext.Provider>
    </I18nProvider>
  )
}
const e = (id: string, vehicleId: number): FleetEntry => ({ id, vehicleId, nickname: '', note: '', addedAt: 0, setup: {} })

describe('FleetView', () => {
  test('adicionar pela busca cria a linha com os dados', async () => {
    render(<Harness />)
    await userEvent.type(screen.getByRole('combobox', { name: 'Adicionar nave ou veículo' }), 'prosp')
    await userEvent.click(screen.getByRole('option', { name: /MISC Prospector/ }))
    const row = screen.getByRole('row', { name: /MISC Prospector/ })
    for (const txt of ['Musashi Industrial', 'Mineração', '32', '1', 'US$ 155', '3.297.600']) expect(row).toHaveTextContent(txt)
  })

  test('totais no topo com aviso de quem não tem preço em dólar', () => {
    render(<Harness initial={[e('a', 50), e('b', 50), e('c', 41)]} />)
    const totals = screen.getByTestId('fleet-totals')
    expect(totals).toHaveTextContent('3 naves')
    expect(totals).toHaveTextContent('US$ 310')
    expect(totals).toHaveTextContent('1 sem preço em dólar')
  })

  test('nave que sumiu do UEX aparece como desconhecida, pode ser removida e fica fora dos totais', async () => {
    render(<Harness initial={[e('a', 50), e('x', 9999)]} />)
    const row = screen.getByRole('row', { name: /Nave desconhecida/ })
    expect(screen.getByTestId('fleet-totals')).toHaveTextContent('US$ 155')
    await userEvent.click(within(row).getByRole('button', { name: 'Remover' }))
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar remoção' }))
    expect(screen.queryByRole('row', { name: /Nave desconhecida/ })).toBeNull()
  })

  test('remover pede confirmação e cancelar mantém', async () => {
    render(<Harness initial={[e('a', 50)]} />)
    await userEvent.click(within(screen.getByRole('row', { name: /MISC Prospector/ })).getByRole('button', { name: 'Remover' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.getByRole('row', { name: /MISC Prospector/ })).toBeInTheDocument()
  })

  test('SCU respeita o SCU digitado na ROTAS', () => {
    render(<Harness initial={[e('a', 41)]} prefs={{ ...DEFAULT_PREFS, scuOverrides: { 41: 128 } }} />)
    expect(screen.getByRole('row', { name: /Drake Caterpillar/ })).toHaveTextContent('128')
  })

  test('detalhe: apelido, onde comprar e montar setup', async () => {
    const onOpenSetup = vi.fn()
    render(<Harness initial={[e('a', 50)]} onOpenSetup={onOpenSetup} />)
    await userEvent.click(screen.getByRole('row', { name: /MISC Prospector/ }))
    const detail = screen.getByRole('region', { name: 'MISC Prospector' })
    fireEvent.change(within(detail).getByLabelText('Apelido'), { target: { value: 'Pedreira' } })
    expect(screen.getByRole('row', { name: /Pedreira/ })).toBeInTheDocument()
    await userEvent.click(within(detail).getByRole('button', { name: /New Deal Lorville/ }))
    expect(screen.getByRole('dialog', { name: /New Deal Lorville/ })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Fechar' }))
    await userEvent.click(within(detail).getByRole('button', { name: 'Montar setup' }))
    expect(onOpenSetup).toHaveBeenCalledWith('a')
  })
})

describe('ajustes da revisão', () => {
  test('uma nave no singular e desconhecidas contadas à parte', () => {
    render(<Harness initial={[e('a', 50), e('x', 9999)]} />)
    const totals = screen.getByTestId('fleet-totals')
    expect(totals).toHaveTextContent(/1 nave(?!s)/)
    expect(totals).toHaveTextContent('1 desconhecida')
  })

  test('frota que não carregou: aviso e sem campo de adicionar', () => {
    render(<Harness loadFailed />)
    expect(screen.getByText(/Não foi possível ler a frota salva/)).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Adicionar nave ou veículo' })).toBeNull()
  })
})

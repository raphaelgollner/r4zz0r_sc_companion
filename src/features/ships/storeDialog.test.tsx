import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test } from 'vitest'
import { TerminalsContext } from '../../data/terminals'
import type { VehiclePrice, VehicleRent } from '../../data/types'
import { I18nProvider } from '../../i18n/i18n'
import { NOW, SEC, terminal, vehicle } from '../../test/fixtures'
import { ShipsView } from './ShipsView'

const vehicles = [
  vehicle(41, 'Caterpillar', 576, { name_full: 'Drake Caterpillar', company_name: 'Drake Interplanetary' }),
  vehicle(99, 'Hawk', 0, { name_full: 'Anvil Hawk', company_name: 'Anvil Aerospace', is_military: 1, is_cargo: 0 }),
  vehicle(50, 'Prospector', 0, { name_full: 'MISC Prospector', company_name: 'MISC', is_mining: 1, is_cargo: 0 }),
]
const purchases: VehiclePrice[] = [
  { id: 1, id_vehicle: 41, id_terminal: 3, price_buy: 2_800_000, date_modified: SEC - 3600, vehicle_name: 'Caterpillar', terminal_name: 'New Deal Lorville' },
  { id: 2, id_vehicle: 99, id_terminal: 3, price_buy: 1_500_000, date_modified: SEC - 3600, vehicle_name: 'Hawk', terminal_name: 'New Deal Lorville' },
  { id: 3, id_vehicle: 50, id_terminal: 4, price_buy: 2_000_000, date_modified: SEC - 3600, vehicle_name: 'Prospector', terminal_name: 'Astro Armada' },
]
const rentals: VehicleRent[] = [
  { id: 4, id_vehicle: 50, id_terminal: 3, price_rent: 50_000, date_modified: SEC - 3600, vehicle_name: 'Prospector', terminal_name: 'New Deal Lorville' },
]
const terminals = new Map([[3, terminal(3, { star_system_name: 'Stanton', planet_name: 'Hurston', city_name: 'Lorville', type: 'vehicle_buy' })]])

function renderShips() {
  render(
    <I18nProvider initial="pt">
      <TerminalsContext.Provider value={terminals}>
        <ShipsView vehicles={vehicles} purchases={purchases} rentals={rentals} now={NOW} />
      </TerminalsContext.Provider>
    </I18nProvider>,
  )
}

async function openStore() {
  await userEvent.click(screen.getByRole('row', { name: /Drake Caterpillar/ }))
  await userEvent.click(screen.getByRole('button', { name: /New Deal Lorville/ }))
  return screen.getByRole('dialog', { name: /New Deal Lorville/ })
}

describe('janela da loja', () => {
  test('mostra localização e naves vendidas e alugadas ali', async () => {
    renderShips()
    const dialog = await openStore()
    expect(dialog).toHaveTextContent('Stanton › Hurston › Lorville')
    expect(within(dialog).getByRole('row', { name: /Drake Caterpillar/ })).toHaveTextContent('2.800.000')
    expect(within(dialog).getByRole('row', { name: /Anvil Hawk/ })).toHaveTextContent('1.500.000')
    expect(within(dialog).getByRole('row', { name: /MISC Prospector/ })).toHaveTextContent('50.000')
  })

  test('Esc fecha', async () => {
    renderShips()
    await openStore()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  test('clicar numa nave da loja seleciona ela e fecha', async () => {
    renderShips()
    const dialog = await openStore()
    await userEvent.click(within(dialog).getByRole('row', { name: /Anvil Hawk/ }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('region', { name: 'Anvil Hawk' })).toBeInTheDocument()
  })
})

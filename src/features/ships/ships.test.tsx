import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test } from 'vitest'
import type { VehiclePrice, VehicleRent } from '../../data/types'
import { I18nProvider } from '../../i18n/i18n'
import { NOW, SEC, vehicle } from '../../test/fixtures'
import { ShipsView } from './ShipsView'

const vehicles = [
  vehicle(41, 'Caterpillar', 576, { name_full: 'Drake Caterpillar', company_name: 'Drake Interplanetary', crew: '1,5', pad_type: 'L', url_photo: 'https://example.com/cat.jpg' }),
  vehicle(50, 'Prospector', 0, { name_full: 'MISC Prospector', company_name: 'Musashi Industrial', is_mining: 1, is_cargo: 0, crew: '1', pad_type: 'S' }),
]
const purchases: VehiclePrice[] = [
  { id: 1, id_vehicle: 41, id_terminal: 1, price_buy: 2_800_000, date_modified: SEC - 2 * 3600, vehicle_name: 'Caterpillar', terminal_name: 'Astro Armada' },
]
const rentals: VehicleRent[] = [
  { id: 2, id_vehicle: 41, id_terminal: 5, price_rent: 90_000, date_modified: SEC - 3600, vehicle_name: 'Caterpillar', terminal_name: 'Lorville' },
]

const renderView = (lang: 'pt' | 'en' = 'pt') =>
  render(
    <I18nProvider initial={lang}>
      <ShipsView vehicles={vehicles} purchases={purchases} rentals={rentals} now={NOW} />
    </I18nProvider>,
  )

describe('ShipsView', () => {
  test('tabela com tipo, SCU, tripulação, pad, compra e aluguel', () => {
    renderView()
    const row = screen.getByRole('row', { name: /Drake Caterpillar/ })
    for (const txt of ['Drake Interplanetary', 'Carga', '576', '1,5', 'L', '2.800.000', '90.000']) expect(row).toHaveTextContent(txt)
  })

  test('nave sem oferta mostra "Não vendida in-game"', () => {
    renderView()
    expect(screen.getByRole('row', { name: /MISC Prospector/ })).toHaveTextContent('Não vendida in-game')
  })

  test('busca e filtro por tipo', async () => {
    renderView()
    await userEvent.selectOptions(screen.getByLabelText('Tipo'), 'mining')
    expect(screen.queryByRole('row', { name: /Caterpillar/ })).toBeNull()
    expect(screen.getByRole('row', { name: /Prospector/ })).toBeInTheDocument()
  })

  test('clicar abre detalhe com foto e terminais', async () => {
    renderView()
    await userEvent.click(screen.getByRole('row', { name: /Drake Caterpillar/ }))
    const detail = screen.getByRole('region', { name: 'Drake Caterpillar' })
    expect(within(detail).getByRole('img', { name: 'Drake Caterpillar' })).toHaveAttribute('src', 'https://example.com/cat.jpg')
    expect(within(detail).getByRole('row', { name: /Astro Armada/ })).toHaveTextContent('há 2 h')
    expect(within(detail).getByRole('row', { name: /Lorville/ })).toHaveTextContent('90.000')
  })

  test('em EN cabeçalhos mudam e o nome da nave não', () => {
    renderView('en')
    expect(screen.getByText(/Manufacturer/)).toBeInTheDocument()
    expect(screen.getByRole('row', { name: /Drake Caterpillar/ })).toHaveTextContent('Cargo')
  })
})

describe('copiar destino nas lojas', () => {
  test('sem botão dentro de botão e com o botão copiar ao lado', async () => {
    const { container } = renderView()
    await userEvent.click(screen.getByRole('row', { name: /Drake Caterpillar/ }))
    expect(container.querySelectorAll('button button')).toHaveLength(0)
    expect(screen.getAllByRole('button', { name: /Copiar destino: Astro Armada/ })).toHaveLength(1)
  })
})

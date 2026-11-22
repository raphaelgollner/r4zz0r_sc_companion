import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, test } from 'vitest'
import type { CurrencyIndex, CurrencyIndexPoint, Moon, Planet } from '../../data/types'
import { I18nProvider } from '../../i18n/i18n'
import { GOLD, HADANITE, LARANITE, NOW, PRICES, SEC, terminal } from '../../test/fixtures'
import { CurrenciesView } from './CurrenciesView'
import { HarvestablesView } from './HarvestablesView'
import { LocationsView } from './LocationsView'

const wrap = (ui: ReactNode) => render(<I18nProvider initial="pt">{ui}</I18nProvider>)

describe('LocationsView', () => {
  const terminals = [
    terminal(8, { displayname: 'ArcCorp 141', planet_name: 'ArcCorp', moon_name: 'Wala' }),
    terminal(12, { displayname: 'TDD Area 18', planet_name: 'ArcCorp', city_name: 'Area 18' }),
    terminal(99, { displayname: 'Loja de itens', type: 'item' }),
  ]

  test('árvore expansível até o terminal e mostra o que é negociado', async () => {
    wrap(<LocationsView terminals={terminals} prices={PRICES} now={NOW} />)
    await userEvent.click(screen.getByRole('button', { name: /Stanton/ }))
    await userEvent.click(screen.getByRole('button', { name: /ArcCorp/ }))
    await userEvent.click(screen.getByRole('button', { name: /Area 18/ }))
    await userEvent.click(screen.getByRole('button', { name: 'TDD Area 18' }))
    const detail = screen.getByRole('region', { name: 'TDD Area 18' })
    expect(within(detail).getByRole('row', { name: /Laranite/ })).toHaveTextContent('8.500')
    expect(within(detail).getByRole('row', { name: /Hadanite/ })).toBeInTheDocument()
    expect(screen.queryByText('Loja de itens')).toBeNull()
  })
})

describe('HarvestablesView', () => {
  const planets = new Map<number, Planet>([[4, { id: 4, name: 'Hurston' }]])
  const moons = new Map<number, Moon>([[1, { id: 1, name: 'Aberdeen' }]])

  test('só harvestables, com melhor venda e onde aparece', () => {
    wrap(<HarvestablesView commodities={[LARANITE, GOLD, HADANITE]} prices={PRICES} planets={planets} moons={moons} now={NOW} />)
    const row = screen.getByRole('row', { name: /Hadanite/ })
    expect(row).toHaveTextContent('TDD Area 18')
    expect(row).toHaveTextContent('526.545')
    expect(row).toHaveTextContent('Aberdeen, Hurston')
    expect(screen.queryByRole('row', { name: /Laranite/ })).toBeNull()
  })
})

describe('CurrenciesView', () => {
  const index: CurrencyIndex = {
    currency: 'UEC', index_value: 637.92, basket_value: 87321.93, date_modified: SEC - 600,
    components: [
      { id_commodity: 56, commodity_name: 'Processed Food', weight: 0.1851, avg_price: 1446.46, base_price: 175.1 },
    ],
  }
  const history: CurrencyIndexPoint[] = [
    { index_value: 640, date_added: SEC - 100 },
    { index_value: 600, date_added: SEC - 300 },
    { index_value: 620, date_added: SEC - 200 },
  ]

  test('mostra índice, explicação, componentes e histórico', () => {
    wrap(<CurrenciesView index={[index]} history={history} now={NOW} />)
    expect(screen.getByText('637,92')).toBeInTheDocument()
    expect(screen.getByText(/Não é câmbio/)).toBeInTheDocument()
    const row = screen.getByRole('row', { name: /Processed Food/ })
    expect(row).toHaveTextContent('18,5%')
    expect(row).toHaveTextContent('1.446')
    expect(row).toHaveTextContent('175')
    const line = screen.getByTestId('sparkline').querySelector('polyline')!
    const ys = line.getAttribute('points')!.split(' ').map((p) => Number(p.split(',')[1]))

    expect(ys[0]).toBeGreaterThan(ys[1])
    expect(ys[1]).toBeGreaterThan(ys[2])
  })
})

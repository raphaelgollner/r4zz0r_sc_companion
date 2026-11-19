import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, test } from 'vitest'
import { I18nProvider } from '../../i18n/i18n'
import { DEFAULT_PREFS, type Prefs } from '../../store/prefs'
import { GOLD, LARANITE, NOW, PRICES, price, terminal, vehicle } from '../../test/fixtures'
import { HomeView } from '../home/HomeView'
import { RoutesView } from './RoutesView'

const vehicles = [vehicle(1, 'Caterpillar', 576)]
const terminals = [
  terminal(8, { planet_name: 'ArcCorp', moon_name: 'Wala' }),
  terminal(12, { planet_name: 'ArcCorp', city_name: 'Area 18' }),
  terminal(20, { star_system_name: 'Pyro', planet_name: 'Pyro I', space_station_name: 'Ruin Station' }),
]
const prices = [...PRICES, price(47, 20, { price_sell: 9900, scu_sell: 500, terminal_name: 'Ruin Station', commodity_name: 'Laranite' })]

function Harness({ home = false }: { home?: boolean }) {
  const [prefs, setPrefs] = useState<Prefs>({ ...DEFAULT_PREFS, shipId: 1, budget: 5_000_000 })
  const common = { vehicles, commodities: [LARANITE, GOLD], prices, terminals, now: NOW, prefs, onPrefs: (p: Partial<Prefs>) => setPrefs((x) => ({ ...x, ...p })) }
  return (
    <I18nProvider initial="pt">
      {home ? <HomeView {...common} cache={[]} onSetup={() => {}} onRefreshAll={() => {}} /> : <RoutesView {...common} />}
    </I18nProvider>
  )
}
const cardsText = () => screen.getAllByRole('article').map((a) => a.textContent).join('|')

describe('Evitar', () => {
  test('evitar Pyro tira as rotas que passam por lá; remover traz de volta', async () => {
    render(<Harness />)
    expect(cardsText()).toContain('Ruin Station')
    await userEvent.type(screen.getByRole('combobox', { name: 'Evitar' }), 'Pyr')
    await userEvent.click(screen.getByRole('option', { name: /^Pyro sistema/ }))
    expect(cardsText()).not.toContain('Ruin Station')
    expect(cardsText()).toContain('TDD Area 18')
    await userEvent.click(screen.getByRole('button', { name: 'Remover Pyro' }))
    expect(cardsText()).toContain('Ruin Station')
  })

  test('item já evitado some da busca e o lugar mostra planeta e sistema', async () => {
    render(<Harness />)
    const box = screen.getByRole('combobox', { name: 'Evitar' })
    await userEvent.type(box, 'Pyr')
    expect(screen.getByRole('option', { name: /^Pyro I planeta · Pyro/ })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('option', { name: /^Pyro sistema/ }))
    await userEvent.type(box, 'Pyr')
    const names = within(screen.getByRole('listbox')).getAllByRole('option').map((o) => o.textContent)
    expect(names.some((n) => n?.startsWith('Pyro sistema'))).toBe(false)
    expect(names).toContain('Ruin Station Pyro I · Pyro')
  })

  test('ROTAS (compacto) também tem o campo', () => {
    render(<Harness home />)
    expect(screen.getByRole('combobox', { name: 'Evitar' })).toBeInTheDocument()
  })
})

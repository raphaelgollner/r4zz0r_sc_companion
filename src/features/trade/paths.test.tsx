import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { beforeEach, describe, expect, test } from 'vitest'
import { createRateLimiter } from '../../api/rateLimiter'
import { memoryStore } from '../../cache/store'
import { UexProvider } from '../../data/useUex'
import { I18nProvider } from '../../i18n/i18n'
import { DEFAULT_PREFS, type Prefs } from '../../store/prefs'
import { resetRouteMarksForTest } from '../../store/routeMarks'
import { commodity, GOLD, LARANITE, NOW, price, PRICES, terminal, vehicle } from '../../test/fixtures'
import { RoutesView } from './RoutesView'

const X = commodity(1, 'Xenon')
const Y = commodity(2, 'Yarrow')
const Z = commodity(3, 'Zinc')
const T = [1, 2, 3, 4].map((id) => terminal(id, { displayname: `Porto ${id}` }))
const chain = [
  price(1, 1, { price_buy: 100, scu_buy: 100, terminal_name: 'Porto 1' }),
  price(1, 2, { price_sell: 110, scu_sell: 1000, terminal_name: 'Porto 2' }),
  price(2, 2, { price_buy: 100, scu_buy: 150, terminal_name: 'Porto 2' }),
  price(2, 1, { price_sell: 150, scu_sell: 1000, terminal_name: 'Porto 1' }),
  price(3, 2, { price_buy: 100, scu_buy: 1000, terminal_name: 'Porto 2' }),
  price(3, 4, { price_sell: 400, scu_sell: 1000, terminal_name: 'Porto 4' }),
]

function Harness({ initial = {}, data = { commodities: [X, Y, Z], prices: chain, terminals: T } }: { initial?: Partial<Prefs>; data?: { commodities: typeof X[]; prices: typeof chain; terminals: typeof T } }) {
  const [prefs, setPrefs] = useState<Prefs>({ ...DEFAULT_PREFS, shipId: 1, budget: 1_000_000, ...initial })
  return (
    <RoutesView
      vehicles={[vehicle(1, 'Caterpillar', 100)]}
      commodities={data.commodities}
      prices={data.prices}
      terminals={data.terminals}
      now={NOW}
      prefs={prefs}
      onPrefs={(p) => setPrefs((x) => ({ ...x, ...p }))}
    />
  )
}

const distances: Record<string, number> = { '8:12': 1, '8:13': 100 }
const fetchFn = (async (url: string) => {
  const u = new URL(url)
  const k = `${u.searchParams.get('id_terminal_origin')}:${u.searchParams.get('id_terminal_destination')}`
  return new Response(JSON.stringify({ status: 'ok', data: { distance: String(distances[k] ?? '') } }))
}) as typeof fetch

const renderIt = (ui: React.ReactNode) =>
  render(
    <I18nProvider initial="pt">
      <UexProvider value={{ store: memoryStore(), fetchFn, limiter: createRateLimiter({ maxPerWindow: 1000, windowMs: 1 }) }}>{ui}</UexProvider>
    </I18nProvider>,
  )

describe('CAMINHO, ROTATIVO e REDUZIR DISTÂNCIAS', () => {
  beforeEach(() => {
    localStorage.clear()
    resetRouteMarksForTest()
  })

  test('CAMINHO mostra trechos encadeados: a venda de um é a compra do próximo', async () => {
    renderIt(<Harness initial={{ pathLegs: 2 }} />)
    await userEvent.click(screen.getByRole('checkbox', { name: 'CAMINHO' }))
    expect(screen.getByRole('combobox', { name: 'Começar em' })).toBeInTheDocument()
    const first = screen.getByRole('region', { name: /^Caminho 1/ })
    const cards = within(first).getAllByRole('article')
    expect(cards[0]).toHaveTextContent('1 de 2')
    expect(cards[1]).toHaveTextContent('2 de 2')
    expect(cards[0]).toHaveTextContent(/VENDE\s*Porto 2/)
    expect(cards[1]).toHaveTextContent(/COMPRA\s*Porto 2/)
  })

  test('ROTATIVO desmarca CAMINHO e mostra ida e volta entre dois terminais', async () => {
    renderIt(<Harness initial={{ routeMode: 'path' }} />)
    await userEvent.click(screen.getByRole('checkbox', { name: 'ROTATIVO' }))
    expect(screen.getByRole('checkbox', { name: 'CAMINHO' })).not.toBeChecked()
    expect(screen.queryByLabelText('Trechos')).toBeNull()
    const r = screen.getByRole('region', { name: /^Rotativo 1/ })
    const text = within(r).getAllByRole('article').map((a) => a.textContent)
    expect(text[0]).toMatch(/COMPRA\s*Porto 2.*VENDE\s*Porto 1/)
    expect(text[1]).toMatch(/COMPRA\s*Porto 1.*VENDE\s*Porto 2/)
  })

  test('REDUZIR DISTÂNCIAS reordena por lucro por Gm quando as distâncias chegam', async () => {
    const data = { commodities: [LARANITE, GOLD], prices: PRICES, terminals: [terminal(8), terminal(12), terminal(13)] }
    renderIt(<Harness data={data} initial={{ shipId: 1, budget: 5_000_000 }} />)
    const firstCard = () => screen.getAllByRole('article')[0]
    expect(firstCard()).toHaveTextContent('Lorville CBD')
    await userEvent.click(screen.getByRole('checkbox', { name: 'REDUZIR DISTÂNCIAS' }))
    await waitFor(() => expect(firstCard()).toHaveTextContent('TDD Area 18'))
    expect(firstCard()).toHaveTextContent(/1 Gm/)
    expect(firstCard()).toHaveTextContent(/aUEC\/Gm/)
  })
})

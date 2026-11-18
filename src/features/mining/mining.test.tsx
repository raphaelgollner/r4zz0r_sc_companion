import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, test } from 'vitest'
import { createRateLimiter } from '../../api/rateLimiter'
import { memoryStore } from '../../cache/store'
import type { Moon, Planet, RawPriceRow, RefineryMethod, RefineryYield, VehiclePrice } from '../../data/types'
import { UexProvider } from '../../data/useUex'
import { I18nProvider } from '../../i18n/i18n'
import { commodity, HADANITE, NOW, price, vehicle } from '../../test/fixtures'
import App from '../../app/App'
import { GroundView } from './GroundView'
import { OresView } from './OresView'
import { RefineriesView } from './RefineriesView'

const wrap = (ui: ReactNode) => render(<I18nProvider initial="pt">{ui}</I18nProvider>)

const laraniteRaw = commodity(48, 'Laranite (Raw)', { is_raw: 1, is_refined: 0, ids_moons: '1' })
const laranite = commodity(47, 'Laranite')
const quantRaw = commodity(59, 'Quantainium (Raw)', { is_raw: 1, is_refined: 0 })
const quant = commodity(58, 'Quantainium')
const commodities = [laraniteRaw, laranite, quantRaw, quant, HADANITE]
const rawPrices: RawPriceRow[] = [{ id: 1, id_commodity: 48, id_terminal: 5, price_sell: 3000, date_modified: 1, commodity_name: 'Laranite (Raw)', terminal_name: 'Shubin SAL-5' }]
const prices = [price(47, 12, { price_sell: 8700, terminal_name: 'TDD Area 18' }), price(36, 12, { price_sell: 526545, terminal_name: 'TDD Area 18' })]
const planets = new Map<number, Planet>([[4, { id: 4, name: 'Hurston' }]])
const moons = new Map<number, Moon>([[1, { id: 1, name: 'Aberdeen' }]])

describe('aba MINERAÇÃO', () => {
  test('está habilitada e tem as 5 sub-abas', async () => {
    const fetchFn = (async () => new Response(JSON.stringify({ status: 'ok', data: [] }))) as typeof fetch
    render(
      <I18nProvider initial="pt">
        <UexProvider value={{ store: memoryStore(), fetchFn, limiter: createRateLimiter({ maxPerWindow: 1000, windowMs: 1 }) }}>
          <App />
        </UexProvider>
      </I18nProvider>,
    )
    await userEvent.click(screen.getByRole('tab', { name: 'MINERAÇÃO' }))
    for (const name of ['Ores', 'Refineries', 'Refine Planner', 'Equipment', 'Ground Mining'])
      expect(screen.getByRole('tab', { name })).toBeInTheDocument()
  })
})

describe('OresView', () => {
  test('mostra bruto, refinado e ganho', () => {
    wrap(<OresView commodities={commodities} rawPrices={rawPrices} prices={prices} planets={planets} moons={moons} now={NOW} />)
    const row = screen.getByRole('row', { name: /Laranite \(Raw\)/ })
    expect(row).toHaveTextContent('3.000')
    expect(row).toHaveTextContent('8.700')
    expect(row).toHaveTextContent('190,0%')
    expect(row).toHaveTextContent('Aberdeen')
  })
})

describe('RefineriesView', () => {
  const yields: RefineryYield[] = [
    { id_commodity: 59, id_terminal: 1, value: 5, commodity_name: 'Quantainium (Raw)', terminal_name: 'ARC-L1', date_modified: 1 },
    { id_commodity: 59, id_terminal: 2, value: -2, commodity_name: 'Quantainium (Raw)', terminal_name: 'CRU-L1', date_modified: 1 },
    { id_commodity: 48, id_terminal: 1, value: 3, commodity_name: 'Laranite (Raw)', terminal_name: 'ARC-L1', date_modified: 1 },
  ]
  const methods: RefineryMethod[] = [{ id: 1, name: 'Dinyx Solventation', code: 'DIN', rating_yield: 3, rating_cost: 1, rating_speed: 1 }]

  test('filtra por minério e colore bônus e penalidade', async () => {
    wrap(<RefineriesView yields={yields} capacities={[]} methods={methods} />)
    await userEvent.selectOptions(screen.getByLabelText('Minério'), '59')
    const arc = screen.getByRole('row', { name: /ARC-L1/ })
    expect(within(arc).getByText('+5%')).toHaveClass('profit')
    expect(within(screen.getByRole('row', { name: /CRU-L1/ })).getByText('−2%')).toHaveClass('loss')
  })

  test('métodos com notas traduzidas', () => {
    wrap(<RefineriesView yields={yields} capacities={[]} methods={methods} />)
    const row = screen.getByRole('row', { name: /Dinyx Solventation/ })
    expect(row).toHaveTextContent('alto')
    expect(row).toHaveTextContent('baixo')
  })
})

describe('GroundView', () => {
  test('gemas com melhor venda e onde aparecem; ROC com preço', () => {
    const roc = vehicle(200, 'ROC', 0, { name_full: 'Greycat ROC', is_ground_vehicle: 1, is_mining: 1, is_cargo: 0 })
    const purchases: VehiclePrice[] = [{ id: 1, id_vehicle: 200, id_terminal: 9, price_buy: 150000, date_modified: 1, vehicle_name: 'ROC', terminal_name: 'Lorville' }]
    wrap(<GroundView commodities={commodities} prices={prices} planets={planets} moons={moons} vehicles={[roc]} purchases={purchases} rentals={[]} now={NOW} />)
    const gem = screen.getByRole('row', { name: /Hadanite/ })
    expect(gem).toHaveTextContent('526.545')
    expect(gem).toHaveTextContent('Aberdeen, Hurston')
    expect(screen.getByRole('row', { name: /Greycat ROC/ })).toHaveTextContent('150.000')
  })
})

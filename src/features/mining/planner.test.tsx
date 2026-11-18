import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createRateLimiter } from '../../api/rateLimiter'
import { memoryStore } from '../../cache/store'
import type { RawPriceRow, RefineryYield } from '../../data/types'
import { UexProvider } from '../../data/useUex'
import { I18nProvider } from '../../i18n/i18n'
import { DEFAULT_MINER_PREFS, loadMinerPrefs, saveMinerPrefs, type MinerPrefs } from '../../store/minerPrefs'
import { commodity, NOW, price, terminal } from '../../test/fixtures'
import { DistanceFetcher } from './DistanceFetcher'
import { PlannerView } from './PlannerView'

const commodities = [
  commodity(59, 'Quantainium (Raw)', { is_raw: 1 }),
  commodity(58, 'Quantainium'),
  commodity(48, 'Laranite (Raw)', { is_raw: 1 }),
  commodity(47, 'Laranite'),
  commodity(90, 'Ice (Raw)', { is_raw: 1 }),
]
const y = (id_commodity: number, id_terminal: number, value: number, terminal_name: string, commodity_name = ''): RefineryYield => ({
  id_commodity, id_terminal, value, terminal_name, commodity_name, date_modified: 1,
})
const yields = [y(59, 1, 5, 'Alpha Refinery', 'Quantainium (Raw)'), y(48, 1, -2, 'Alpha Refinery', 'Laranite (Raw)'), y(90, 2, 1, 'Beta Refinery', 'Ice (Raw)')]
const prices = [price(58, 12, { price_sell: 148409 }), price(47, 12, { price_sell: 8600 })]
const rawPrices: RawPriceRow[] = [{ id: 1, id_commodity: 59, id_terminal: 5, price_sell: 10000, date_modified: 1, commodity_name: 'Quantainium (Raw)', terminal_name: 'X' }]
const terminals = [terminal(1, { displayname: 'Alpha Refinery' }), terminal(2, { displayname: 'Beta Refinery' }), terminal(77, { displayname: 'Everus Harbor', type: 'commodity' })]

function Harness({ initial = {}, distances = new Map() }: { initial?: Partial<MinerPrefs>; distances?: Map<number, number | null> }) {
  const [prefs, setPrefs] = useState<MinerPrefs>({ ...DEFAULT_MINER_PREFS, ...initial })
  return (
    <I18nProvider initial="pt">
      <PlannerView
        commodities={commodities}
        yields={yields}
        prices={prices}
        rawPrices={rawPrices}
        terminals={terminals}
        distances={distances}
        prefs={prefs}
        onPrefs={(p) => setPrefs((x) => ({ ...x, ...p }))}
        now={NOW}
      />
    </I18nProvider>
  )
}
const cargo = [{ oreId: 59, scu: 12 }, { oreId: 48, scu: 8 }]
const names = () => screen.getAllByRole('row').slice(1).map((r) => r.firstElementChild!.textContent)

describe('PlannerView', () => {
  beforeEach(() => localStorage.clear())

  test('carga vazia pede minério', () => {
    render(<Harness />)
    expect(screen.getByText('Adicione minério e SCU à carga.')).toBeInTheDocument()
  })

  test('ranking por valor com o valor estimado', () => {
    render(<Harness initial={{ cargo }} />)
    expect(names()).toEqual(['Alpha Refinery', 'Beta Refinery'])
    expect(screen.getByRole('row', { name: /Alpha Refinery/ })).toHaveTextContent('1.937.377')
    expect(screen.getByRole('row', { name: /Beta Refinery/ })).toHaveTextContent('1.849.708')
    expect(screen.getByText(/Estimativa: não inclui o rendimento do método/)).toBeInTheDocument()
    expect(screen.getByTestId('sell-raw')).toHaveTextContent('120.000')
  })

  test('por distância: sem distância vai por último e mostra —', async () => {
    render(<Harness initial={{ cargo, locationId: 77, sortBy: 'distance' }} distances={new Map([[1, 120], [2, null]])} />)
    expect(names()).toEqual(['Alpha Refinery', 'Beta Refinery'])
    expect(screen.getByRole('row', { name: /Alpha Refinery/ })).toHaveTextContent('120 Gm')
    expect(screen.getByRole('row', { name: /Beta Refinery/ })).toHaveTextContent('—')
  })

  test('adicionar minério pela busca e digitar SCU', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar minério' }))
    await userEvent.type(screen.getByRole('combobox', { name: 'Minério 1' }), 'Quant')
    await userEvent.click(screen.getByRole('option', { name: /Quantainium \(Raw\)/ }))
    await userEvent.type(screen.getByLabelText('SCU do minério 1'), '10')
    expect(screen.getByRole('row', { name: /Alpha Refinery/ })).toHaveTextContent('1.558.295')
  })
})

describe('minerPrefs', () => {
  test('salva e lê a carga', () => {
    saveMinerPrefs({ ...DEFAULT_MINER_PREFS, cargo, locationId: 77 })
    expect(loadMinerPrefs()).toMatchObject({ cargo, locationId: 77 })
  })
})

describe('DistanceFetcher', () => {
  test('busca só os pares pedidos e não repete ao re-renderizar', async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ status: 'ok', data: { distance: '120' } }))) as unknown as typeof fetch
    const onDistance = vi.fn()
    const ui = (n: number) => (
      <UexProvider value={{ store: memoryStore(), fetchFn, limiter: createRateLimiter({ maxPerWindow: 1000, windowMs: 1 }) }}>
        <DistanceFetcher origin={77} destination={1} onDistance={onDistance} key={n > 0 ? 'x' : 'x'} />
      </UexProvider>
    )
    const r = render(ui(0))
    await waitFor(() => expect(onDistance).toHaveBeenCalledWith(1, 120))
    r.rerender(ui(1))
    expect((fetchFn as unknown as { mock: { calls: unknown[] } }).mock.calls).toHaveLength(1)
  })
})

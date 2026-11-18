import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, test } from 'vitest'
import { TerminalsContext } from '../../data/terminals'
import { I18nProvider } from '../../i18n/i18n'
import { DEFAULT_SALVAGE_PREFS, type SalvagePrefs } from '../../store/salvagePrefs'
import { commodity, NOW, price, terminal, vehicle } from '../../test/fixtures'
import { MaterialsSummary } from './MaterialsView'
import { SalvagePlannerView } from './SalvagePlannerView'

const RMC = commodity(63, 'Recycled Material Composite', { code: 'RMC' })
const CMAT = commodity(19, 'Construction Materials', { code: 'CMAT' })
const SCRAP = commodity(67, 'Scrap', { code: 'SCRA' })
const WASTE = commodity(79, 'Waste', { code: 'WAST' })
const materials = [RMC, CMAT, SCRAP, WASTE]
const prices = [
  price(63, 1, { price_sell: 8500, scu_sell: 12, terminal_name: "Seer's Canyon" }),
  price(63, 2, { price_sell: 7700, scu_sell: 50, terminal_name: 'Admin - Gaslight' }),
  price(19, 2, { price_sell: 11915, scu_sell: 50, terminal_name: 'Admin - Gaslight' }),
  price(67, 2, { price_sell: 3471, scu_sell: 50, terminal_name: 'Admin - Gaslight' }),
  price(79, 2, { price_sell: 322, scu_sell: 50, terminal_name: 'Admin - Gaslight' }),
]
const terminals = [terminal(1, { displayname: "Seer's Canyon" }), terminal(2, { displayname: 'Admin - Gaslight' })]
const VULTURE = vehicle(300, 'Vulture', 12, { name_full: 'Drake Vulture', is_salvage: 1 })

const wrap = (ui: React.ReactNode) => (
  <I18nProvider initial="pt">
    <TerminalsContext.Provider value={new Map(terminals.map((x) => [x.id, x]))}>{ui}</TerminalsContext.Provider>
  </I18nProvider>
)

describe('Materials', () => {
  test('os 4 materiais com a melhor venda', () => {
    render(wrap(<MaterialsSummary materials={materials} prices={prices} now={NOW} />))
    const rmc = screen.getByRole('row', { name: /Recycled Material Composite/ })
    expect(rmc).toHaveTextContent('8.500')
    expect(rmc).toHaveTextContent("Seer's Canyon")
    for (const n of ['Construction Materials', 'Scrap', 'Waste']) expect(screen.getByRole('row', { name: new RegExp(n) })).toBeInTheDocument()
  })
})

function Planner({ initial = {} }: { initial?: Partial<SalvagePrefs> }) {
  const [prefs, setPrefs] = useState<SalvagePrefs>({ ...DEFAULT_SALVAGE_PREFS, ...initial })
  return wrap(
    <>
      <SalvagePlannerView
        materials={materials}
        prices={prices}
        ships={[VULTURE]}
        fleetIds={new Set()}
        scuOf={(v) => v.scu}
        terminals={terminals}
        distances={new Map()}
        prefs={prefs}
        onPrefs={(p) => setPrefs((x) => ({ ...x, ...p }))}
        now={NOW}
      />
      <output data-testid="prefs">{JSON.stringify(prefs)}</output>
    </>,
  )
}

describe('Salvage Planner', () => {
  test('carga acima da capacidade da nave mostra aviso', () => {
    render(<Planner initial={{ shipId: 300, cargo: [{ commodityId: 63, scu: 20 }] }} />)
    expect(screen.getByText(/passa da capacidade/)).toHaveTextContent('12')
  })

  test('terminais ordenados por valor, com aviso de demanda', () => {
    render(<Planner initial={{ cargo: [{ commodityId: 63, scu: 20 }] }} />)
    const rows = screen.getAllByRole('row').slice(1)
    expect(rows[0]).toHaveTextContent("Seer's Canyon")
    expect(rows[0]).toHaveTextContent('170.000')
    expect(rows[0]).toHaveTextContent(/Demanda menor/)
  })

  test('SCU com vírgula e escolha do material', async () => {
    render(<Planner />)
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar material' }))
    await userEvent.selectOptions(screen.getByLabelText('Material 1'), '19')
    fireEvent.change(screen.getByLabelText('SCU 1'), { target: { value: '3,5' } })
    const prefs = JSON.parse(screen.getByTestId('prefs').textContent!) as SalvagePrefs
    expect(prefs.cargo).toEqual([{ commodityId: 19, scu: 3.5 }])
    expect(within(screen.getAllByRole('row')[1]).getByText(/41\.703/)).toBeInTheDocument()
  })
})

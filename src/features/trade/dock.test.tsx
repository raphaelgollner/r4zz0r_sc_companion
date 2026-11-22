import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, test } from 'vitest'
import { I18nProvider } from '../../i18n/i18n'
import { DEFAULT_PREFS, loadPrefs, type Prefs } from '../../store/prefs'
import { GOLD, LARANITE, NOW, PRICES, terminal, vehicle } from '../../test/fixtures'
import { RoutesView } from './RoutesView'

const vehicles = [vehicle(1, 'Caterpillar', 576, { name_full: 'Drake Caterpillar' }), vehicle(9, 'Hull C', 4608, { name_full: 'MISC Hull C', is_loading_dock: 1 })]
// Só 8 (compra) e 13 (venda) têm doca; 12 não.
const terminals = [terminal(8, { has_loading_dock: 1 }), terminal(12), terminal(13, { has_loading_dock: 1 })]

function Harness({ initial = {} }: { initial?: Partial<Prefs> }) {
  const [prefs, setPrefs] = useState<Prefs>({ ...DEFAULT_PREFS, budget: 50_000_000, ...initial })
  return (
    <I18nProvider initial="pt">
      <RoutesView vehicles={vehicles} commodities={[LARANITE, GOLD]} prices={PRICES} terminals={terminals} now={NOW} prefs={prefs} onPrefs={(p) => setPrefs((x) => ({ ...x, ...p }))} />
    </I18nProvider>
  )
}
const sellsAt = () => screen.queryAllByRole('article').map((a) => a.textContent ?? '')

describe('doca de carga externa nas rotas', () => {
  test('nave comum: sem interruptor e rotas para qualquer terminal', () => {
    render(<Harness initial={{ shipId: 1 }} />)
    expect(screen.queryByLabelText(/doca de carga externa/)).toBeNull()
    expect(sellsAt().some((t) => t.includes('TDD Area 18'))).toBe(true)
    expect(screen.queryByText('DOCA EXTERNA')).toBeNull()
  })

  test('Hull C: interruptor ligado, contagem e só terminais com doca', async () => {
    render(<Harness initial={{ shipId: 9 }} />)
    const sw = screen.getByLabelText(/Hull C: só estações com doca de carga externa \(2\)/)
    expect(sw).toBeChecked()
    expect(sellsAt().length).toBeGreaterThan(0)
    expect(sellsAt().every((t) => !t.includes('TDD Area 18'))).toBe(true)
    expect(screen.getAllByText('DOCA EXTERNA').length).toBeGreaterThan(0)
    await userEvent.click(sw)
    expect(sellsAt().some((t) => t.includes('TDD Area 18'))).toBe(true)
  })

  test('preferência saneada: padrão ligado, só false desliga', () => {
    localStorage.setItem('tayko.prefs', JSON.stringify({ dockFilter: 'x' }))
    expect(loadPrefs().dockFilter).toBe(true)
    localStorage.setItem('tayko.prefs', JSON.stringify({ dockFilter: false }))
    expect(loadPrefs().dockFilter).toBe(false)
    localStorage.removeItem('tayko.prefs')
  })
})

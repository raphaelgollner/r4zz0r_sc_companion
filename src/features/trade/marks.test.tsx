import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { beforeEach, describe, expect, test } from 'vitest'
import { I18nProvider } from '../../i18n/i18n'
import { DEFAULT_PREFS, type Prefs } from '../../store/prefs'
import { resetRouteMarksForTest } from '../../store/routeMarks'
import { GOLD, LARANITE, NOW, PRICES, SEC, terminal, vehicle } from '../../test/fixtures'
import { RoutesView } from './RoutesView'

const terminals = [terminal(8), terminal(12), terminal(13)]

function Harness() {
  const [prefs, setPrefs] = useState<Prefs>({ ...DEFAULT_PREFS, shipId: 1, budget: 5_000_000 })
  return (
    <I18nProvider initial="pt">
      <RoutesView
        vehicles={[vehicle(1, 'Caterpillar', 576)]}
        commodities={[LARANITE, GOLD]}
        prices={PRICES}
        terminals={terminals}
        now={NOW}
        prefs={prefs}
        onPrefs={(p) => setPrefs((x) => ({ ...x, ...p }))}
      />
    </I18nProvider>
  )
}
const card = () => screen.queryAllByRole('article').find((a) => a.textContent?.includes('TDD Area 18'))
const mark = async (c: HTMLElement, name: string) => {
  await userEvent.click(within(c).getByText('Marcar'))
  await userEvent.click(within(c).getByRole('checkbox', { name }))
}

describe('marcações nas rotas', () => {
  beforeEach(() => {
    localStorage.clear()
    resetRouteMarksForTest()
  })

  test('várias marcações no mesmo card', async () => {
    render(<Harness />)
    await mark(card()!, 'ESTOQUE MENOR')
    await mark(card()!, 'FEITO')
    expect(within(card()!).getByText('ESTOQUE MENOR', { selector: '.mark-tag' })).toBeInTheDocument()
    expect(within(card()!).getByText('FEITO', { selector: '.mark-tag' })).toBeInTheDocument()
  })

  test('OCULTAR tira o card; Ver ocultas mostra e permite desfazer', async () => {
    render(<Harness />)
    await mark(card()!, 'OCULTAR')
    expect(card()).toBeUndefined()
    await userEvent.click(screen.getByRole('button', { name: 'Ver ocultas (1)' }))
    expect(card()).toBeDefined()
    await mark(card()!, 'OCULTAR')
    expect(card()).toBeUndefined()
    await userEvent.click(screen.getByRole('button', { name: 'Voltar às rotas' }))
    expect(card()).toBeDefined()
    expect(screen.getByRole('button', { name: 'Ver ocultas (0)' })).toBeInTheDocument()
  })

  test('oculta que não calcula mais aparece na lista simples e volta com "Mostrar de novo"', async () => {
    localStorage.setItem(
      'tayko.routeMarks',
      JSON.stringify({ '99:1:2': { marks: ['hidden', 'lowStock'], buyAt: 1, sellAt: 1, commodityName: 'Quartz', buyName: 'Shubin SAL-2', sellName: 'MIC-L5' } }),
    )
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'Ver ocultas (1)' }))
    const row = screen.getByRole('listitem', { name: /Quartz/ })
    expect(row).toHaveTextContent('Shubin SAL-2 → MIC-L5')
    await userEvent.click(within(row).getByRole('button', { name: 'Mostrar de novo' }))
    expect(screen.queryByRole('listitem', { name: /Quartz/ })).toBeNull()
  })

  test('marcação que expira some quando a venda recebe dado novo; HOSTIL fica', () => {
    localStorage.setItem(
      'tayko.routeMarks',
      JSON.stringify({ '47:8:12': { marks: ['lowStock', 'danger'], buyAt: SEC, sellAt: SEC - 4 * 3600, commodityName: 'Laranite', buyName: 'a', sellName: 'b' } }),
    )
    render(<Harness />)
    expect(within(card()!).queryByText('ESTOQUE MENOR', { selector: '.mark-tag' })).toBeNull()
    expect(within(card()!).getByText('HOSTIL', { selector: '.mark-tag' })).toBeInTheDocument()
  })
})

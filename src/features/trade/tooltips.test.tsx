import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, test } from 'vitest'
import { TerminalsContext } from '../../data/terminals'
import { computeRoutes } from '../../domain/routes'
import { I18nProvider } from '../../i18n/i18n'
import { GOLD, LARANITE, NOW, PRICES, STATUS, TERMINALS } from '../../test/fixtures'
import { CommoditiesView } from './CommoditiesView'
import { PriceFinderView } from './PriceFinderView'
import { RouteCard } from './RouteCard'

const wrap = (ui: ReactNode) =>
  render(
    <I18nProvider initial="pt">
      <TerminalsContext.Provider value={TERMINALS}>{ui}</TerminalsContext.Provider>
    </I18nProvider>,
  )

describe('tooltips e nome do lugar', () => {
  test('Commodities: terminal com nome do lugar e caminho no hover', async () => {
    wrap(<CommoditiesView commodities={[LARANITE, GOLD]} prices={PRICES} status={STATUS} now={NOW} />)
    await userEvent.click(screen.getByRole('row', { name: /Laranite/ }))
    const row = within(screen.getByRole('region', { name: /Laranite/ })).getByRole('row', { name: /ArcCorp 141/ })
    expect(row).toHaveTextContent('ArcCorp Mining Area 141')
    await userEvent.hover(within(row).getByText('ArcCorp 141'))
    expect(screen.getByRole('tooltip')).toHaveTextContent('Stanton › ArcCorp › Wala › ArcCorp Mining Area 141')
  })

  test('StatusBadge mostra nome completo e faixa', async () => {
    wrap(<CommoditiesView commodities={[LARANITE]} prices={PRICES} status={STATUS} now={NOW} />)
    await userEvent.click(screen.getByRole('row', { name: /Laranite/ }))
    await userEvent.hover(screen.getAllByText('Medium')[0])
    expect(screen.getByRole('tooltip')).toHaveTextContent('Medium Inventory (44-57%)')
  })

  test('RouteCard explica o limite', async () => {
    const r = computeRoutes(PRICES, [LARANITE], TERMINALS, { shipScu: 576, budget: 5_000_000, excludeIllegal: true, sortBy: 'profit' })
    const route = r.ok ? r.routes.find((x) => x.sell.id_terminal === 12)! : null
    wrap(<RouteCard route={route!} now={NOW} />)
    await userEvent.hover(screen.getByText(/limite: estoque/))
    expect(screen.getByRole('tooltip')).toHaveTextContent('O terminal não tem mais estoque que isso.')
  })

  test('Price Finder mostra o lugar', async () => {
    wrap(<PriceFinderView commodities={[LARANITE]} prices={PRICES} now={NOW} />)
    await userEvent.type(screen.getByRole('combobox'), 'Lara')
    await userEvent.click(screen.getByRole('option', { name: /Laranite/ }))
    await userEvent.click(screen.getByRole('tab', { name: 'Onde comprar' }))
    expect(screen.getByRole('row', { name: /ArcCorp 141/ })).toHaveTextContent('ArcCorp Mining Area 141')
  })
})

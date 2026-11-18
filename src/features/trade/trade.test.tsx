import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, test } from 'vitest'
import { I18nProvider } from '../../i18n/i18n'
import { GOLD, HADANITE, LARANITE, NOW, PRICES, STATUS } from '../../test/fixtures'
import { CommoditiesView } from './CommoditiesView'
import { PriceFinderView } from './PriceFinderView'

const wrap = (ui: ReactNode, lang: 'pt' | 'en' = 'pt') => render(<I18nProvider initial={lang}>{ui}</I18nProvider>)
const commodities = [LARANITE, GOLD, HADANITE]

describe('CommoditiesView', () => {
  test('lista nome, código e preços médios', () => {
    wrap(<CommoditiesView commodities={commodities} prices={PRICES} status={STATUS} now={NOW} />)
    const row = screen.getByRole('row', { name: /Laranite/ })
    expect(row).toHaveTextContent('LARA')
    expect(row).toHaveTextContent('7.346')
    expect(row).toHaveTextContent('8.600')
  })

  test('busca filtra por nome ou código', async () => {
    wrap(<CommoditiesView commodities={commodities} prices={PRICES} status={STATUS} now={NOW} />)
    await userEvent.type(screen.getByPlaceholderText('Buscar…'), 'lara')
    expect(screen.getByRole('row', { name: /Laranite/ })).toBeInTheDocument()
    expect(screen.queryByRole('row', { name: /Gold/ })).toBeNull()
  })

  test('clicar abre preços por terminal com estoque, demanda, status e idade', async () => {
    wrap(<CommoditiesView commodities={commodities} prices={PRICES} status={STATUS} now={NOW} />)
    await userEvent.click(screen.getByRole('row', { name: /Laranite/ }))
    const detail = screen.getByRole('region', { name: /Laranite/ })
    const arc = within(detail).getByRole('row', { name: /ArcCorp 141/ })
    expect(arc).toHaveTextContent('7.047')
    expect(arc).toHaveTextContent('434')
    expect(arc).toHaveTextContent('Medium')
    expect(arc).toHaveTextContent('há 3 h')
    expect(within(detail).getByRole('row', { name: /TDD Area 18/ })).toHaveTextContent('1.000')
  })

  test('em EN os cabeçalhos mudam e o nome do produto não', async () => {
    wrap(<CommoditiesView commodities={commodities} prices={PRICES} status={STATUS} now={NOW} />, 'en')
    expect(screen.getByText(/Avg. buy/)).toBeInTheDocument()
    expect(screen.getByRole('row', { name: /Laranite/ })).toBeInTheDocument()
  })
})

describe('PriceFinderView', () => {
  async function pick(name: string) {
    await userEvent.type(screen.getByRole('combobox'), name)
    await userEvent.click(screen.getByRole('option', { name: new RegExp(name) }))
  }

  test('onde vender: maior preço primeiro', async () => {
    wrap(<PriceFinderView commodities={commodities} prices={PRICES} now={NOW} />)
    await pick('Laranite')
    await userEvent.click(screen.getByRole('tab', { name: 'Onde vender' }))
    const rows = screen.getAllByRole('row').slice(1)
    expect(rows.map((r) => r.firstElementChild!.textContent)).toEqual(['Lorville CBD', 'TDD Area 18'])
  })

  test('onde comprar: menor preço primeiro', async () => {
    wrap(<PriceFinderView commodities={commodities} prices={PRICES} now={NOW} />)
    await pick('Laranite')
    await userEvent.click(screen.getByRole('tab', { name: 'Onde comprar' }))
    const rows = screen.getAllByRole('row').slice(1)
    expect(rows.map((r) => r.firstElementChild!.textContent)).toEqual(['ArcCorp 141'])
  })

  test('commodity sem preço mostra aviso', async () => {
    wrap(<PriceFinderView commodities={commodities} prices={PRICES} now={NOW} />)
    await pick('Hadanite')
    await userEvent.click(screen.getByRole('tab', { name: 'Onde comprar' }))
    expect(screen.getByText('Nenhum terminal com preço registrado.')).toBeInTheDocument()
  })
})

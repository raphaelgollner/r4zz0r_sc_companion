import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { I18nProvider } from '../../i18n/i18n'
import { NOW, SEC } from '../../test/fixtures'
import { CurrenciesView } from './CurrenciesView'

const index = [{ currency: 'UEC', index_value: 130.5, basket_value: 98_000, date_modified: SEC, components: [] }]

describe('Currencies Index', () => {
  test('explica o que o índice é e como ler cada número', () => {
    render(
      <I18nProvider initial="pt">
        <CurrenciesView index={index} history={[]} now={NOW} />
      </I18nProvider>,
    )
    const help = screen.getByRole('region', { name: 'Como ler este índice' })
    expect(help).toHaveTextContent('Não é câmbio')
    expect(help).toHaveTextContent('dezembro de 2023 = 100')
    expect(help).toHaveTextContent('Peso')
    expect(help).toHaveTextContent('Valor da cesta')
    expect(help).toHaveTextContent('inflação')
  })
})

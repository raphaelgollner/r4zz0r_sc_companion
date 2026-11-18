import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { I18nProvider } from '../../i18n/i18n'
import { HistoryView } from './HistoryPanel'

const wrap = (ui: React.ReactNode) => render(<I18nProvider initial="pt">{ui}</I18nProvider>)

describe('HistoryView', () => {
  test('mostra título com o terminal e duas linhas', () => {
    wrap(
      <HistoryView
        terminalName="TDD Area 18"
        points={[
          { price_buy: 7000, price_sell: 8500, date_added: 1_790_000_000 },
          { price_buy: 7100, price_sell: 8700, date_added: 1_790_100_000 },
        ]}
      />,
    )
    expect(screen.getByText(/Histórico em TDD Area 18/)).toBeInTheDocument()
    expect(screen.getByTestId('sparkline').querySelectorAll('polyline')).toHaveLength(2)
  })

  test('com menos de 2 pontos avisa', () => {
    wrap(<HistoryView terminalName="TDD Area 18" points={[{ price_buy: 0, price_sell: 8500, date_added: 1 }]} />)
    expect(screen.getByText('Sem histórico suficiente neste terminal.')).toBeInTheDocument()
  })
})

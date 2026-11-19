import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { beforeEach, describe, expect, test } from 'vitest'
import { I18nProvider } from '../../i18n/i18n'
import { DEFAULT_PREFS, type Prefs } from '../../store/prefs'
import { GOLD, LARANITE, NOW, PRICES, terminal, vehicle } from '../../test/fixtures'
import { RoutesView } from './RoutesView'

const vehicles = [vehicle(1, 'Caterpillar', 576), vehicle(2, 'Prospector', 0, { is_mining: 1 }), vehicle(3, 'Cutlass Black', 46)]
const terminals = [terminal(8), terminal(12), terminal(13)]

function Harness({ initial = {} }: { initial?: Partial<Prefs> }) {
  const [prefs, setPrefs] = useState<Prefs>({ ...DEFAULT_PREFS, ...initial })
  return (
    <I18nProvider initial="pt">
      <RoutesView
        vehicles={vehicles}
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

describe('RoutesView', () => {
  beforeEach(() => localStorage.clear())

  test('lista de naves mostra o SCU do UEX', () => {
    render(<Harness />)
    const options = screen.getAllByRole('option').map((o) => o.textContent)
    expect(options).toContain('Caterpillar · 576 SCU')
  })

  test('sem nave pede para escolher', () => {
    render(<Harness />)
    expect(screen.getByText('Escolha uma nave para calcular.')).toBeInTheDocument()
  })

  test('orçamento vazio pede o valor', async () => {
    render(<Harness />)
    await userEvent.selectOptions(screen.getByLabelText('Nave'), '1')
    expect(screen.getByText('Informe quanto você tem para investir.')).toBeInTheDocument()
  })

  test('Caterpillar + 5.000.000 mostra a rota completa', async () => {
    render(<Harness />)
    await userEvent.selectOptions(screen.getByLabelText('Nave'), '1')
    await userEvent.type(screen.getByLabelText('Dinheiro disponível (aUEC)'), '5.000.000')
    const card = screen.getAllByRole('article').find((a) => a.textContent?.includes('TDD Area 18'))!
    expect(card).toHaveTextContent('Laranite')
    expect(card).toHaveTextContent(/COMPRA\s*ArcCorp 141.*7\.047\/SCU/)
    expect(card).toHaveTextContent(/LEVA\s*434 SCU\s*\(limite: estoque\)/)
    expect(card).toHaveTextContent(/VENDE\s*TDD Area 18.*8\.500\/SCU/)
    expect(card).toHaveTextContent('há 3 h')
  })

  test('card destaca mercadoria, lucro e as duas estações', async () => {
    render(<Harness initial={{ shipId: 1, budget: 5_000_000 }} />)
    const card = screen.getAllByRole('article').find((a) => a.textContent?.includes('TDD Area 18'))!
    expect(within(card).getByRole('heading', { name: 'Laranite' })).toBeInTheDocument()
    expect(card.querySelector('header')).toHaveTextContent(/≈ 630\.602 aUEC\s*·\s*ROI/)
    expect([...card.querySelectorAll('.route-stop')].map((e) => e.textContent)).toEqual(['ArcCorp 141', 'TDD Area 18'])
    expect(card.querySelector('.route-path')).toBeNull()
    expect(card).not.toHaveTextContent('LUCRO')
  })

  test('demanda desconhecida aparece no card', async () => {
    render(<Harness initial={{ shipId: 1, budget: 5_000_000 }} />)
    const lorville = screen.getAllByRole('article').find((a) => a.textContent?.includes('Lorville CBD'))!
    expect(lorville).toHaveTextContent('demanda desconhecida')
  })

  test('nave salva sem carga mostra aviso', () => {
    render(<Harness initial={{ shipId: 2, budget: 1000 }} />)
    expect(screen.getByText(/Essa nave não tem carga em SCU/)).toBeInTheDocument()
  })

  test('orçamento em formato EN não some nem é lido errado', async () => {
    render(<Harness initial={{ shipId: 1 }} />)
    const input = screen.getByLabelText('Dinheiro disponível (aUEC)')
    await userEvent.type(input, '5,000,000')
    expect(input).toHaveValue('5,000,000')
    expect(screen.getAllByRole('article').length).toBeGreaterThan(0)
  })

  test('texto inválido fica no campo em vez de sumir', async () => {
    render(<Harness initial={{ shipId: 1 }} />)
    const input = screen.getByLabelText('Dinheiro disponível (aUEC)')
    await userEvent.type(input, '5000k')
    expect(input).toHaveValue('5000k')
    expect(screen.getByText('Informe quanto você tem para investir.')).toBeInTheDocument()
  })
})

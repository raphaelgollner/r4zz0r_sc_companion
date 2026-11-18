import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, test } from 'vitest'
import { I18nProvider } from '../../i18n/i18n'
import { DEFAULT_PREFS, type Prefs } from '../../store/prefs'
import { GOLD, LARANITE, NOW, PRICES, terminal, vehicle } from '../../test/fixtures'
import { HomeView } from '../home/HomeView'
import { RoutesView } from './RoutesView'

const vehicles = [
  vehicle(1, 'Caterpillar', 576, { name_full: 'Drake Caterpillar' }),
  vehicle(2, 'Prospector', 0, { name_full: 'MISC Prospector', is_mining: 1 }),
  vehicle(7, 'Galaxy', 64, { name_full: 'RSI Galaxy' }),
]
const terminals = [terminal(8), terminal(12), terminal(13)]

function Harness({ initial = {}, balance = null, home = false }: { initial?: Partial<Prefs>; balance?: number | null; home?: boolean }) {
  const [prefs, setPrefs] = useState<Prefs>({ ...DEFAULT_PREFS, ...initial })
  const onPrefs = (p: Partial<Prefs>) => setPrefs((x) => ({ ...x, ...p }))
  const common = { vehicles, commodities: [LARANITE, GOLD], prices: PRICES, terminals, now: NOW, prefs, onPrefs, balance }
  return (
    <I18nProvider initial="pt">
      {home ? (
        <HomeView {...common} cache={[]} onSetup={() => {}} onRefreshAll={() => {}} />
      ) : (
        <RoutesView {...common} />
      )}
      <output data-testid="prefs">{JSON.stringify(prefs)}</output>
    </I18nProvider>
  )
}
const prefsNow = () => JSON.parse(screen.getByTestId('prefs').textContent!) as Prefs

describe('RouteControls', () => {
  test('naves sem SCU no UEX aparecem na lista', () => {
    render(<Harness />)
    expect(screen.getAllByRole('option').some((o) => o.textContent === 'MISC Prospector')).toBe(true)
  })

  test('SCU digitado fica salvo por nave e vale no cálculo', async () => {
    render(<Harness initial={{ budget: 50_000_000 }} />)
    await userEvent.selectOptions(screen.getByLabelText('Nave'), '7')
    const scu = screen.getByLabelText('SCU')
    expect(scu).toHaveValue('64')
    await userEvent.clear(scu)
    await userEvent.type(scu, '192')
    expect(prefsNow().scuOverrides).toEqual({ 7: 192 })
    expect(screen.getAllByRole('article')[0]).toHaveTextContent(/LEVA\s*192 SCU/)
  })

  test('↺ volta para o SCU do UEX', async () => {
    render(<Harness initial={{ shipId: 7, scuOverrides: { 7: 192 } }} />)
    await userEvent.click(screen.getByRole('button', { name: /usar SCU do UEX/ }))
    expect(screen.getByLabelText('SCU')).toHaveValue('64')
    expect(prefsNow().scuOverrides).toEqual({})
  })

  test('Usar meu saldo preenche o dinheiro', async () => {
    render(<Harness initial={{ shipId: 1 }} balance={750_000} />)
    await userEvent.click(screen.getByRole('button', { name: 'Usar meu saldo' }))
    expect(screen.getByLabelText('Dinheiro disponível (aUEC)')).toHaveValue('750.000')
    expect(prefsNow().budget).toBe(750_000)
  })

  test('sem saldo não mostra o botão', () => {
    render(<Harness initial={{ shipId: 1 }} />)
    expect(screen.queryByRole('button', { name: 'Usar meu saldo' })).toBeNull()
  })

  test('INÍCIO tem os controles e trocar a nave muda as rotas', async () => {
    render(<Harness home initial={{ shipId: 1, budget: 5_000_000 }} />)
    expect(screen.getAllByRole('article')[0]).toHaveTextContent(/434 SCU/)
    await userEvent.selectOptions(screen.getByLabelText('Nave'), '7')
    expect(screen.getAllByRole('article')[0]).toHaveTextContent(/64 SCU/)
  })
})

describe('ajustes do campo SCU e do saldo', () => {
  test('apagar o SCU remove o valor digitado e volta ao do UEX ao sair do campo', async () => {
    render(<Harness initial={{ shipId: 7, scuOverrides: { 7: 192 } }} />)
    const scu = screen.getByLabelText('SCU')
    await userEvent.clear(scu)
    expect(prefsNow().scuOverrides).toEqual({})
    await userEvent.tab()
    expect(scu).toHaveValue('64')
  })

  test('decimal fica como digitado até sair do campo', async () => {
    render(<Harness initial={{ shipId: 7 }} />)
    const scu = screen.getByLabelText('SCU')
    await userEvent.clear(scu)
    await userEvent.type(scu, '10,5')
    expect(scu).toHaveValue('10,5')
  })

  test('saldo negativo desabilita Usar meu saldo', () => {
    render(<Harness initial={{ shipId: 1 }} balance={-5} />)
    expect(screen.getByRole('button', { name: 'Usar meu saldo' })).toBeDisabled()
  })
})

import { render, renderHook, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, test } from 'vitest'
import { memoryStore } from '../../cache/store'
import { I18nProvider } from '../../i18n/i18n'
import { ProgressProvider, useOptionalBalance, useProgress } from '../../store/progress'
import { commodity, terminal } from '../../test/fixtures'
import type { Commodity, Terminal } from '../../data/types'
import { ProgressView } from './ProgressView'

const COMMODITIES = [commodity(1, 'Quartz'), commodity(2, 'Gold')]
const TERMINALS = [
  terminal(10, { displayname: 'Shubin SAL-2', planet_name: 'ArcCorp', moon_name: 'Lyria', outpost_name: 'Shubin Mining Facility SAL-2' }),
  terminal(20, { displayname: 'MIC-L5', planet_name: 'microTech', space_station_name: 'MIC-L5 Modern Icarus Station' }),
]

function renderView(uex: { commodities?: Commodity[]; terminals?: Terminal[] } = { commodities: COMMODITIES, terminals: TERMINALS }) {
  render(
    <I18nProvider initial="pt">
      <ProgressProvider store={memoryStore()}>
        <ProgressView {...uex} />
      </ProgressProvider>
    </I18nProvider>,
  )
}

async function setBalanceTo(text: string) {
  await userEvent.click(screen.getByRole('button', { name: 'Definir saldo' }))
  await userEvent.type(screen.getByLabelText('Novo saldo (aUEC)'), text)
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
}

async function addTx(kind: 'Entrada' | 'Saída', value: string, description: string, category: string) {
  await userEvent.selectOptions(screen.getByLabelText('Tipo'), kind)
  await userEvent.type(screen.getByLabelText('Valor (aUEC)'), value)
  await userEvent.selectOptions(screen.getByLabelText('Categoria'), category)
  await userEvent.type(screen.getByLabelText('Descrição'), description)
  await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
}

describe('ProgressView', () => {
  test('definir saldo', async () => {
    renderView()
    await screen.findByRole('button', { name: 'Definir saldo' })
    await setBalanceTo('1.000.000')
    expect(screen.getByTestId('balance')).toHaveTextContent('1.000.000')
  })

  test('sessão com entrada e saída, excluir e encerrar', async () => {
    renderView()
    await screen.findByRole('button', { name: 'Definir saldo' })
    await setBalanceTo('1.000.000')
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar sessão' }))
    await addTx('Entrada', '250.000', 'Venda Laranite', 'Trade')
    await addTx('Saída', '20.000', 'Combustível', 'Combustível')
    expect(screen.getByTestId('session-net')).toHaveTextContent('230.000')
    expect(screen.getByTestId('balance')).toHaveTextContent('1.230.000')

    await userEvent.click(screen.getByRole('button', { name: 'Excluir: Combustível' }))
    const confirm = screen.getByRole('dialog', { name: 'Excluir esta transação?' })
    await userEvent.click(within(confirm).getByRole('button', { name: 'Excluir' }))
    expect(screen.getByTestId('session-net')).toHaveTextContent('250.000')

    await userEvent.click(screen.getByRole('button', { name: 'Encerrar sessão' }))
    expect(screen.getByRole('button', { name: 'Iniciar sessão' })).toBeInTheDocument()
    const sessions = screen.getByRole('region', { name: 'Sessões' })
    expect(within(sessions).getAllByRole('row')[1]).toHaveTextContent('250.000')
  })

  test('Salvar desabilitado com valor vazio, zero ou inválido', async () => {
    renderView()
    const save = await screen.findByRole('button', { name: 'Salvar' })
    expect(save).toBeDisabled()
    const value = screen.getByLabelText('Valor (aUEC)')
    await userEvent.type(value, '0')
    expect(save).toBeDisabled()
    await userEvent.clear(value)
    await userEvent.type(value, 'abc')
    expect(save).toBeDisabled()
    await userEvent.clear(value)
    await userEvent.type(value, '10')
    expect(save).toBeEnabled()
  })

  test('sem seção de perfil', async () => {
    renderView()
    await screen.findByRole('button', { name: 'Salvar' })
    expect(screen.queryByText('Perfil')).toBeNull()
    expect(screen.queryByLabelText('Trocar foto')).toBeNull()
  })

  test('recurso, local, SCU e preço: valor calculado e resumo da sessão', async () => {
    renderView()
    await userEvent.click(await screen.findByRole('button', { name: 'Iniciar sessão' }))
    await userEvent.selectOptions(screen.getByLabelText('Tipo'), 'Saída')
    await userEvent.type(screen.getByRole('combobox', { name: 'Recurso' }), 'Qua')
    await userEvent.click(screen.getByRole('option', { name: /^Quartz/ }))
    await userEvent.type(screen.getByRole('combobox', { name: 'Local' }), 'SAL')
    await userEvent.click(screen.getByRole('option', { name: /^Shubin SAL-2/ }))
    await userEvent.type(screen.getByLabelText('SCU'), '100')
    await userEvent.type(screen.getByLabelText('Preço/SCU'), '2.500')
    expect(screen.getByLabelText('Valor (aUEC)')).toHaveValue('250.000')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    const row = screen.getAllByRole('row').filter((r) => r.textContent?.includes('−250.000')).at(-1)!
    expect(row).toHaveTextContent('Quartz')
    expect(row).toHaveTextContent('Shubin SAL-2')
    const summary = screen.getByRole('region', { name: 'Resumo da sessão' })
    expect(summary).toHaveTextContent(/Quartz.*100 SCU/)
    expect(summary).toHaveTextContent('Comprou Quartz')
  })

  test('sem dados do UEX os campos de busca ficam desabilitados e o resto funciona', async () => {
    renderView({})
    const save = await screen.findByRole('button', { name: 'Salvar' })
    expect(screen.getByRole('combobox', { name: 'Recurso' })).toBeDisabled()
    expect(screen.getByRole('combobox', { name: 'Local' })).toBeDisabled()
    await userEvent.type(screen.getByLabelText('Valor (aUEC)'), '10')
    expect(save).toBeEnabled()
  })

  test('LIMPAR DADOS pede confirmação; cancelar mantém, limpar zera', async () => {
    renderView()
    await screen.findByRole('button', { name: 'Definir saldo' })
    await setBalanceTo('1.000.000')
    await userEvent.click(screen.getByRole('button', { name: 'Limpar dados' }))
    let dialog = screen.getByRole('dialog', { name: 'Limpar dados?' })
    expect(dialog).toHaveTextContent('serão perdidos')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    expect(screen.getByTestId('balance')).toHaveTextContent('1.000.000')
    await userEvent.click(screen.getByRole('button', { name: 'Limpar dados' }))
    dialog = screen.getByRole('dialog', { name: 'Limpar dados?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Limpar' }))
    expect(screen.getByTestId('balance')).toHaveTextContent(/^0/)
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('useOptionalBalance', () => {
  test('sem lançamentos é null; com lançamentos é o saldo', async () => {
    const wrapper = ({ children }: { children: ReactNode }) => <ProgressProvider store={memoryStore()}>{children}</ProgressProvider>
    const { result } = renderHook(() => ({ b: useOptionalBalance(), p: useProgress() }), { wrapper })
    await waitFor(() => expect(result.current.p.ready).toBe(true))
    expect(result.current.b).toBeNull()
    result.current.p.apply((d) => ({ ...d, txs: [{ id: 'a', amount: 750_000, kind: 'adjust', category: 'other', description: '', at: 1, sessionId: null }] }))
    await waitFor(() => expect(result.current.b).toBe(750_000))
  })
})

import { render, renderHook, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, test } from 'vitest'
import { memoryStore } from '../../cache/store'
import { I18nProvider } from '../../i18n/i18n'
import { ProgressProvider, useOptionalBalance, useProgress } from '../../store/progress'
import { ProgressView } from './ProgressView'

function renderView() {
  render(
    <I18nProvider initial="pt">
      <ProgressProvider store={memoryStore()}>
        <ProgressView />
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

  test('foto que não é imagem mostra aviso', async () => {
    renderView()
    const input = await screen.findByLabelText('Trocar foto')
    await userEvent.upload(input, new File(['oi'], 'nota.txt', { type: 'text/plain' }), { applyAccept: false })
    expect(await screen.findByText('Escolha um arquivo de imagem de até 10 MB.')).toBeInTheDocument()
  })

  test('nome do perfil é salvo', async () => {
    renderView()
    const name = await screen.findByLabelText('Nome')
    await userEvent.type(name, 'Rapha')
    expect(name).toHaveValue('Rapha')
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

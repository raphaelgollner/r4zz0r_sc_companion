import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { memoryStore, type KVStore } from '../../cache/store'
import { I18nProvider } from '../../i18n/i18n'
import { ProgressProvider } from '../../store/progress'
import { Dialog } from '../../ui/Dialog'
import { ProgressView } from './ProgressView'

const wrap = (store: KVStore = memoryStore()) =>
  render(
    <I18nProvider initial="pt">
      <ProgressProvider store={store}>
        <ProgressView />
      </ProgressProvider>
    </I18nProvider>,
  )

afterEach(() => vi.useRealTimers())

describe('correções do PROGRESSO', () => {
  test('lançamento sem mexer na data usa a hora do salvamento', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 0, 1, 10, 0))
    wrap()
    await screen.findByRole('button', { name: 'Salvar' })
    vi.setSystemTime(new Date(2026, 0, 1, 12, 30))
    await userEvent.type(screen.getByLabelText('Valor (aUEC)'), '100')
    await userEvent.type(screen.getByLabelText('Descrição'), 'Venda')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(screen.getByRole('row', { name: /Venda/ })).toHaveTextContent('12:30')
  })

  test('falha ao ler o progresso avisa e não grava por cima', async () => {
    const set = vi.fn(async () => {})
    const broken: KVStore = { get: async () => Promise.reject(new Error('blocked')), set, clear: async () => {} }
    wrap(broken)
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível ler seu progresso salvo')
    expect(screen.queryByRole('button', { name: 'Salvar' })).toBeNull()
    expect(set).not.toHaveBeenCalled()
  })

  test('encerrar sessão com filtro "Desta sessão" volta para "Todas"', async () => {
    wrap()
    await userEvent.click(await screen.findByRole('button', { name: 'Iniciar sessão' }))
    await userEvent.type(screen.getByLabelText('Valor (aUEC)'), '100')
    await userEvent.type(screen.getByLabelText('Descrição'), 'Venda')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await userEvent.selectOptions(screen.getByLabelText('Filtro'), 'active')
    await userEvent.click(screen.getByRole('button', { name: 'Encerrar sessão' }))
    expect(screen.getByLabelText('Filtro')).toHaveValue('all')
    expect(screen.getByRole('row', { name: /Venda/ })).toBeInTheDocument()
  })
})

describe('Dialog', () => {
  test('re-render do pai não tira o foco de dentro da janela', async () => {
    let rerender!: () => void
    function Parent() {
      const [, setN] = useState(0)
      rerender = () => setN((n) => n + 1)
      return (
        <I18nProvider initial="pt">
          <Dialog title="Teste" onClose={() => {}}>
            <button>Dentro</button>
          </Dialog>
        </I18nProvider>
      )
    }
    render(<Parent />)
    screen.getByRole('button', { name: 'Dentro' }).focus()
    act(() => rerender())
    await waitFor(() => expect(screen.getByRole('button', { name: 'Dentro' })).toHaveFocus())
  })
})

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { I18nProvider } from '../i18n/i18n'
import { DataTable, FreshnessBadge, LoadState, StatusBadge } from './components'

const wrap = (ui: React.ReactNode) => render(<I18nProvider initial="pt">{ui}</I18nProvider>)

describe('DataTable', () => {
  const rows = [{ id: 1, n: 'B', v: 2 }, { id: 2, n: 'A', v: 10 }, { id: 3, n: 'C', v: 1 }]
  const columns = [
    { key: 'n', header: 'Nome', render: (r: (typeof rows)[0]) => r.n, sortValue: (r: (typeof rows)[0]) => r.n },
    { key: 'v', header: 'Valor', render: (r: (typeof rows)[0]) => r.v, sortValue: (r: (typeof rows)[0]) => r.v },
  ]
  const names = () => screen.getAllByRole('row').slice(1).map((r) => r.firstElementChild!.textContent)

  test('clicar no cabeçalho ordena e inverte', async () => {
    wrap(<DataTable rows={rows} columns={columns} rowKey={(r) => r.id} />)
    await userEvent.click(screen.getByText('Valor'))
    expect(names()).toEqual(['C', 'B', 'A'])
    await userEvent.click(screen.getByText(/Valor/))
    expect(names()).toEqual(['A', 'B', 'C'])
  })

  test('lista vazia mostra mensagem', () => {
    wrap(<DataTable rows={[]} columns={columns} rowKey={(r) => r.id} empty="Vazio aqui" />)
    expect(screen.getByText('Vazio aqui')).toBeInTheDocument()
  })
})

describe('LoadState', () => {
  test('sem dados e com erro mostra mensagem e botão que chama onRetry', async () => {
    const onRetry = vi.fn()
    wrap(<LoadState loading={false} error="network" hasData={false} onRetry={onRetry}>conteúdo</LoadState>)
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar os dados do UEX.')
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(onRetry).toHaveBeenCalled()
    expect(screen.queryByText('conteúdo')).toBeNull()
  })

  test('com dados e erro mostra aviso e o conteúdo', () => {
    wrap(<LoadState loading={false} error="network" hasData onRetry={() => {}}>conteúdo</LoadState>)
    expect(screen.getByText(/Mostrando dados salvos/)).toBeInTheDocument()
    expect(screen.getByText('conteúdo')).toBeInTheDocument()
  })
})

describe('badges', () => {
  test('FreshnessBadge usa a cor do nível', () => {
    const now = 1_800_000_000_000
    wrap(<FreshnessBadge dateModifiedSec={now / 1000 - 13 * 3600} now={now} warnHours={12} />)
    expect(screen.getByText('há 13 h')).toHaveClass('age-aging')
  })

  test('StatusBadge mostra o nome curto com a cor', () => {
    wrap(<StatusBadge code={1} levels={[{ code: 1, name: 'Out of Stock', name_short: 'Out Stock', colors: 'red' }]} />)
    expect(screen.getByText('Out Stock')).toHaveClass('status-red')
  })
})

describe('mensagem de dados salvos por tipo de erro', () => {
  const show = (error: string) =>
    wrap(<LoadState loading={false} error={error} hasData onRetry={() => {}}>x</LoadState>)
  test('limite de consultas', () => {
    show('requests_limit_reached')
    expect(screen.getByText(/Limite de consultas do UEX/)).toBeInTheDocument()
  })
  test('sem conexão', () => {
    show('network')
    expect(screen.getByText(/Sem conexão com o UEX/)).toBeInTheDocument()
  })
  test('erro do servidor mostra o código', () => {
    show('http_500')
    expect(screen.getByText(/O UEX respondeu com erro \(http_500\)/)).toBeInTheDocument()
  })
})

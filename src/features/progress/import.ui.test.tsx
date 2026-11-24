import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import type { Commodity } from '../../data/types'
import type { RawLogFile } from '../../domain/gamelog'
import { I18nProvider } from '../../i18n/i18n'
import { terminal } from '../../test/fixtures'
import { ImportView } from './ImportView'
import { DEFAULT_GAME_DIR, type ImportDeps, type SavedImport } from './importService'

const IRON = 'f386a33c-ac9a-400a-a7b8-fe1fc7c8d270'
const DIR = 'D:\\Games\\StarCitizen\\LIVE'
const login = '<2026-11-23T20:32:48.672Z> [Notice] <AccountLoginCharacterStatus_Character> Character: Pilot_One 1 - updatedAt 1 - geid 1 - accountId 1 - name Pilot_One - state STATE_CURRENT [Team_GameServices][Login]'
const start = '<2026-11-23T21:29:57.943Z> [Notice] <Calculate Route> | NOT AUTH | X|CSCItemNavigation::CalculateRoute|Projected Start Location is Everus Harbor for route to destination Y [Team_CGP4][QuantumTravel]'
const buy = `<2026-11-23T21:20:00.000Z> [Notice] <CEntityComponentCommodityUIProvider::SendCommodityBuyRequest> Sending SShopCommodityBuyRequest - playerId[1] shopId[1] shopName[S] kioskId[1] price[276000.000000] shopPricePerCentiSCU[27.6] resourceGUID[${IRON}] autoLoading[1] quantity[10000.000000 cSCU] Cargo Box Data: boxSize[32.000000] | unitAmount[3] [Team]`
const sell = `<2026-11-23T22:00:00.000Z> [Notice] <CEntityComponentCommodityUIProvider::SendCommoditySellRequest> Sending SShopCommoditySellRequest - playerId[1] shopId[2] shopName[S] kioskId[2] amount[356400.000000] resourceGUID[${IRON}] autoLoading[1] quantity[100] transactionMode[ResourceContainer] Cargo Box Data:  [boxSize[4] | unitAmount[25]] [Team]`
const logFile = (lines: string[], last = '2026-11-23T23:00:00.000Z'): RawLogFile => ({ name: 'Game.log', first: '2026-11-23T20:32:28.425Z', last, lines })

function fakeDeps(over: Partial<ImportDeps> = {}, files: RawLogFile[] = [logFile([login, buy, start])]) {
  let saved: SavedImport | undefined
  const deps: ImportDeps = {
    load: vi.fn(async () => saved),
    save: vi.fn(async (v) => {
      saved = v
    }),
    remove: vi.fn(async () => {
      saved = undefined
    }),
    findDir: vi.fn(async () => 'D:\\Games\\StarCitizen\\LIVE'),
    pickDir: vi.fn(async (s: string) => s),
    read: vi.fn(async () => files),
    resolveName: vi.fn(async (g: string) => (g === IRON ? 'Iron' : null)),
    ...over,
  }
  return deps
}

const commodities = [{ id: 30, name: 'Iron' } as Commodity]
const terminals = [terminal(1, { displayname: 'Everus Harbor', space_station_name: 'Everus Harbor' })]
const renderImport = (deps: ImportDeps) =>
  render(
    <I18nProvider initial="pt">
      <ImportView deps={deps} commodities={commodities} terminals={terminals} />
    </I18nProvider>,
  )

describe('IMPORTAÇÃO', () => {
  test('vazia: pergunta no centro, o que entra e o que não entra, aviso de imprecisão e IMPORTAR', async () => {
    renderImport(fakeDeps())
    expect(await screen.findByRole('heading', { name: /Deseja importar o Game.log/ })).toBeInTheDocument()
    expect(screen.getByText(/compras e vendas de mercadoria/)).toBeInTheDocument()
    expect(screen.getByText(/saldo da carteira, combustível, reparos/)).toBeInTheDocument()
    expect(screen.getByText(/Os dados não são precisos/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'IMPORTAR' })).toBeInTheDocument()
  })

  test('IMPORTAR abre o seletor na pasta do jogo encontrada e mostra os registros com nome e local estimado', async () => {
    const deps = fakeDeps()
    renderImport(deps)
    await userEvent.click(await screen.findByRole('button', { name: 'IMPORTAR' }))
    expect(deps.pickDir).toHaveBeenCalledWith('D:\\Games\\StarCitizen\\LIVE')
    expect(deps.read).toHaveBeenCalledWith('D:\\Games\\StarCitizen\\LIVE', [])
    expect(await screen.findByText('Pilot_One')).toBeInTheDocument()
    const row = screen.getAllByRole('row').find((r) => r.textContent?.includes('Iron'))!
    expect(row).toHaveTextContent('≈ Everus Harbor')
    expect(row).toHaveTextContent(/100 SCU/)
    expect(deps.save).toHaveBeenCalled()
  })

  test('sem pasta encontrada, o seletor abre na pasta padrão do Star Citizen', async () => {
    const deps = fakeDeps({ findDir: vi.fn(async () => null) })
    renderImport(deps)
    await userEvent.click(await screen.findByRole('button', { name: 'IMPORTAR' }))
    expect(deps.pickDir).toHaveBeenCalledWith(DEFAULT_GAME_DIR)
  })

  test('cancelar o seletor não importa nada', async () => {
    const deps = fakeDeps({ pickDir: vi.fn(async () => null) })
    renderImport(deps)
    await userEvent.click(await screen.findByRole('button', { name: 'IMPORTAR' }))
    expect(deps.read).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'IMPORTAR' })).toBeInTheDocument()
  })

  test('pasta sem Game.log mostra o erro', async () => {
    renderImport(fakeDeps({ read: vi.fn(async () => Promise.reject(new Error('no_logs'))) }))
    await userEvent.click(await screen.findByRole('button', { name: 'IMPORTAR' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/Não encontrei o Game.log/)
  })

  test('Atualizar importação relê a mesma pasta sem abrir o seletor e não duplica', async () => {
    const deps = fakeDeps()
    renderImport(deps)
    await userEvent.click(await screen.findByRole('button', { name: 'IMPORTAR' }))
    await screen.findByText('Pilot_One')
    deps.read = vi.fn(async () => [logFile([login, buy, start, sell], '2026-11-23T23:30:00.000Z')])
    await userEvent.click(screen.getByRole('button', { name: 'Atualizar importação' }))
    await waitFor(() => expect(screen.getAllByRole('row').filter((r) => r.textContent?.includes('Iron') && r.textContent?.includes('SCU'))).toHaveLength(2))
    expect(deps.pickDir).toHaveBeenCalledTimes(1)
  })

  test('Limpar dados de importação avisa que o Game.log não é apagado e volta ao início', async () => {
    const deps = fakeDeps()
    renderImport(deps)
    await userEvent.click(await screen.findByRole('button', { name: 'IMPORTAR' }))
    await screen.findByText('Pilot_One')
    await userEvent.click(screen.getByRole('button', { name: 'Limpar dados de importação' }))
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent(/O Game.log e os arquivos do jogo não são apagados/)
    await userEvent.click(within(dialog).getByRole('button', { name: 'Limpar importação' }))
    expect(await screen.findByRole('button', { name: 'IMPORTAR' })).toBeInTheDocument()
    expect(deps.remove).toHaveBeenCalled()
  })

  test('Wiki lenta ou fora do ar não segura a importação: os registros aparecem e são salvos antes dos nomes', async () => {
    const deps = fakeDeps({ resolveName: vi.fn(() => new Promise<string | null>(() => {})) })
    renderImport(deps)
    await userEvent.click(await screen.findByRole('button', { name: 'IMPORTAR' }))
    expect(await screen.findByText('Pilot_One')).toBeInTheDocument()
    expect(screen.getAllByRole('row').some((r) => r.textContent?.includes(IRON))).toBe(true)
    expect(deps.save).toHaveBeenCalled()
  })

  test('Atualizar não relê backups já importados', async () => {
    const backup = { ...logFile([login, buy, start]), name: 'Game Build(1).log', first: '2026-11-20T10:00:00.000Z' }
    const deps = fakeDeps({}, [logFile([login, buy, start]), backup])
    renderImport(deps)
    await userEvent.click(await screen.findByRole('button', { name: 'IMPORTAR' }))
    await screen.findByText('Pilot_One')
    expect(deps.read).toHaveBeenLastCalledWith(DIR, [])
    await userEvent.click(screen.getByRole('button', { name: 'Atualizar importação' }))
    await waitFor(() => expect(deps.read).toHaveBeenLastCalledWith(DIR, ['Game Build(1).log']))
  })

  test('importação salva é carregada ao abrir', async () => {
    const deps = fakeDeps()
    renderImport(deps)
    await userEvent.click(await screen.findByRole('button', { name: 'IMPORTAR' }))
    await screen.findByText('Pilot_One')
    document.body.innerHTML = ''
    renderImport(deps)
    expect(await screen.findByText('Pilot_One')).toBeInTheDocument()
  })
})

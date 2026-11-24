import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { memoryStore } from '../../cache/store'
import type { Commodity, Vehicle } from '../../data/types'
import type { LogTail } from '../../domain/overlay'
import { I18nProvider } from '../../i18n/i18n'
import { OverlayProvider, type LiveDeps } from '../../store/overlay'
import { terminal } from '../../test/fixtures'
import { OverlayRecordView } from './OverlayRecordView'

const IRON = 'f386a33c-ac9a-400a-a7b8-fe1fc7c8d270'
const iso = (ms: number) => new Date(ms).toISOString()
const buy = (ms: number) =>
  `<${iso(ms)}> [Notice] <CEntityComponentCommodityUIProvider::SendCommodityBuyRequest> Sending SShopCommodityBuyRequest - playerId[1] shopId[1] shopName[S] kioskId[1] price[1413121.000000] shopPricePerCentiSCU[27.6] resourceGUID[${IRON}] autoLoading[1] quantity[51200.000000 cSCU] Cargo Box Data: boxSize[32.000000] | unitAmount[16] [Team]`
const start = (ms: number) =>
  `<${iso(ms)}> [Notice] <Calculate Route> [ItemNavigation][CL][1] | NOT AUTH | DRAK_Ironclad_Assault_951056760359[951056760359]|CSCItemNavigation::CalculateRoute|Projected Start Location is Everus Harbor for route to destination X [Team_CGP4][QuantumTravel]`

function renderOverlay(tails: LogTail[], getDir: LiveDeps['getDir'] = async () => 'C:\\SC\\LIVE') {
  const live: LiveDeps = {
    getDir,
    tail: vi.fn(async (_d: string, offset: number | null) => (offset === null ? { first: 'f1', offset: 10, lines: [] } : (tails.shift() ?? { first: 'f1', offset, lines: [] }))),
    pollMs: 20,
  }
  render(
    <I18nProvider initial="pt">
      <OverlayProvider store={memoryStore()} live={live}>
        <OverlayRecordView
          commodities={[{ id: 30, name: 'Iron' } as Commodity]}
          terminals={[terminal(1, { displayname: 'Everus Harbor', space_station_name: 'Everus Harbor', planet_name: 'Hurston', star_system_name: 'Stanton' })]}
          vehicles={[{ id: 9, name: 'Ironclad Assault', name_full: 'Drake Ironclad Assault' } as Vehicle]}
          resolveName={async (g) => (g === IRON ? 'Iron' : null)}
        />
      </OverlayProvider>
    </I18nProvider>,
  )
  return live
}

describe('OVERLAY › REGISTRO', () => {
  test('sem sessão: explica e oferece iniciar; saldo próprio começa em zero', async () => {
    renderOverlay([])
    expect(await screen.findByText(/Inicie uma sessão com o jogo aberto/)).toBeInTheDocument()
    expect(screen.getByTestId('overlay-balance')).toHaveTextContent('0 aUEC')
  })

  test('sessão ao vivo: a compra entra sozinha com recurso, caixas, local, preço, auto load e nave; saldo atualiza', async () => {
    const t0 = Date.now() - 60_000
    renderOverlay([{ first: 'f1', offset: 50, lines: [buy(t0 + 1000), start(t0 + 2000)] }])
    await userEvent.click(await screen.findByRole('button', { name: 'Definir saldo' }))
    await userEvent.type(screen.getByLabelText('Novo saldo (aUEC)'), '2000000')
    const clock = vi.spyOn(Date, 'now').mockReturnValue(t0 - 1000)
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
    clock.mockReturnValue(t0)
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar sessão' }))
    vi.restoreAllMocks()
    const row = await screen.findByRole('row', { name: /Iron/ }, { timeout: 7000 })
    expect(row).toHaveTextContent('Compra')
    expect(row).toHaveTextContent(/512 SCU/)
    expect(row).toHaveTextContent('16× 32 SCU')
    expect(row).toHaveTextContent('≈ Everus Harbor · Hurston · Stanton')
    expect(row).toHaveTextContent('2.760')
    expect(row).toHaveTextContent('Sim')
    expect(row).toHaveTextContent('Drake Ironclad Assault')
    expect(screen.getByTestId('overlay-balance')).toHaveTextContent('586.879 aUEC')
  }, 10_000)

  test('sem pasta do jogo: mostra onde escolher', async () => {
    renderOverlay([], async () => null)
    await userEvent.click(await screen.findByRole('button', { name: 'Iniciar sessão' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/OVERLAY › IMPORTAÇÃO/)
  })

  test('Limpar dados pede confirmação e zera o OVERLAY', async () => {
    renderOverlay([])
    await userEvent.click(await screen.findByRole('button', { name: 'Definir saldo' }))
    await userEvent.type(screen.getByLabelText('Novo saldo (aUEC)'), '5000')
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(screen.getByTestId('overlay-balance')).toHaveTextContent('5.000 aUEC')
    await userEvent.click(screen.getByRole('button', { name: 'Limpar dados' }))
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent(/O INÍCIO, a aba IMPORTAÇÃO e o Game.log não mudam/)
    await userEvent.click(within(dialog).getByRole('button', { name: /Apagar|Limpar/ }))
    expect(screen.getByTestId('overlay-balance')).toHaveTextContent('0 aUEC')
  })

  test('encerrar sessão para a leitura', async () => {
    const live = renderOverlay([])
    await userEvent.click(await screen.findByRole('button', { name: 'Iniciar sessão' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Encerrar sessão' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Iniciar sessão' })).toBeInTheDocument())
    const realNow = Date.now()
    vi.spyOn(Date, 'now').mockReturnValue(realNow + 20_000)
    await act(() => new Promise((r) => setTimeout(r, 40)))
    const calls = (live.tail as ReturnType<typeof vi.fn>).mock.calls.length
    await act(() => new Promise((r) => setTimeout(r, 80)))
    expect((live.tail as ReturnType<typeof vi.fn>).mock.calls.length).toBe(calls)
    vi.restoreAllMocks()
    expect(within(screen.getByRole('region', { name: 'Sessões' })).getAllByRole('row').length).toBeGreaterThan(1)
  })
})

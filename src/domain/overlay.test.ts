import { describe, expect, test } from 'vitest'
import type { Commodity, Vehicle } from '../data/types'
import { terminal } from '../test/fixtures'
import { appendTail, CONFIRM_MS, EMPTY_OVERLAY, endOverlay, overlayBalance, overlayView, readingTarget, setOverlayBalance, startOverlay, shipName } from './overlay'

const IRON = 'f386a33c-ac9a-400a-a7b8-fe1fc7c8d270'
const T0 = Date.parse('2026-11-24T20:00:00.000Z')
const iso = (ms: number) => new Date(ms).toISOString()
const buy = (ms: number, price: number, cscu: number) =>
  `<${iso(ms)}> [Notice] <CEntityComponentCommodityUIProvider::SendCommodityBuyRequest> Sending SShopCommodityBuyRequest - playerId[1] shopId[1] shopName[S] kioskId[1] price[${price}.000000] shopPricePerCentiSCU[1] resourceGUID[${IRON}] autoLoading[1] quantity[${cscu}.000000 cSCU] Cargo Box Data: boxSize[32.000000] | unitAmount[${cscu / 3200}] [Team]`
const sellError = (ms: number) => `<${iso(ms)}> [Error] <CEntityComponentCommodityUIProvider::RmToken_CommodityTransactionResponse> Commodity Transaction Response Error - playerId[1] result[InsuffientStock] type[Buying] [Team]`
const start = (ms: number, place: string) =>
  `<${iso(ms)}> [Notice] <Calculate Route> [ItemNavigation][CL][1] | NOT AUTH | DRAK_Ironclad_Assault_951056760359[951056760359]|CSCItemNavigation::CalculateRoute|Projected Start Location is ${place} for route to destination X [Team_CGP4][QuantumTravel]`

const ctx = {
  names: new Map([[IRON, 'Iron']]),
  commodities: [{ id: 30, name: 'Iron' } as Commodity],
  terminals: [terminal(1, { displayname: 'Everus Harbor', space_station_name: 'Everus Harbor', planet_name: 'Hurston', star_system_name: 'Stanton' })],
  prices: [],
  vehicles: [{ id: 9, name: 'Ironclad Assault', name_full: 'Drake Ironclad Assault' } as Vehicle],
}

const tail = (offset: number, lines: string[], first = 'f1') => ({ first, offset, lines })
const view = (d: ReturnType<typeof startOverlay>, now: number, lastRead: number | null = now) => overlayView(d, ctx, now, lastRead)

describe('OVERLAY', () => {
  test('iniciar sessão guarda o ponto do arquivo; só o que vem depois entra', () => {
    let d = startOverlay(EMPTY_OVERLAY, T0, 's1', tail(500, []))
    expect(d.sessions[0]).toMatchObject({ id: 's1', startedAt: T0, endedAt: null, offset: 500, fileFirst: 'f1' })
    d = appendTail(d, 's1', 500, tail(900, [buy(T0 + 60_000, 2760, 3200)]))
    const v = view(d, T0 + 120_000)
    expect(v.rows).toHaveLength(1)
    expect(v.rows[0]).toMatchObject({ op: 'buy', commodityName: 'Iron', scu: 32, boxes: [{ size: 32, count: 1 }], autoLoad: true, amount: -2760 })
    expect(overlayBalance(d, v)).toBe(-2760)
  })

  test('operação só aparece 15 s depois da última leitura do log, e some se o jogo recusar', () => {
    let d = startOverlay(EMPTY_OVERLAY, T0, 's1', tail(0, []))
    d = appendTail(d, 's1', 0, tail(10, [buy(T0 + 1000, 100, 100)]))
    expect(view(d, T0 + 2000).rows).toHaveLength(0)
    expect(view(d, T0 + 1000 + CONFIRM_MS + 1, T0 + 5000).rows).toHaveLength(0)
    expect(view(d, T0 + 1000 + CONFIRM_MS + 1).rows).toHaveLength(1)
    d = appendTail(d, 's1', 10, tail(20, [sellError(T0 + 3000)]))
    expect(view(d, T0 + 60_000).rows).toHaveLength(0)
  })

  test('local confirmado pelo salto seguinte vira estação · planeta · sistema; nave traduzida', () => {
    let d = startOverlay(EMPTY_OVERLAY, T0, 's1', tail(0, []))
    d = appendTail(d, 's1', 0, tail(10, [buy(T0 + 1000, 2760, 3200), start(T0 + 90_000, 'Everus Harbor')]))
    const row = view(d, T0 + 120_000).rows[0]
    expect(row).toMatchObject({ terminalId: 1, place: '≈ Everus Harbor · Hurston · Stanton', ship: 'Drake Ironclad Assault' })
  })

  test('encerrar: operações depois do fim não entram, mas a recusa do jogo que chega logo após ainda é lida', () => {
    let d = startOverlay(EMPTY_OVERLAY, T0, 's1', tail(0, []))
    d = appendTail(d, 's1', 0, tail(10, [buy(T0 + 9_000, 100, 100)]))
    d = endOverlay(d, T0 + 10_000)
    expect(readingTarget(d, T0 + 12_000)?.id).toBe('s1')
    expect(readingTarget(d, T0 + 10_000 + CONFIRM_MS + 1)).toBeNull()
    d = appendTail(d, 's1', 10, tail(20, [sellError(T0 + 12_000), buy(T0 + 20_000, 300, 100)]))
    expect(view(d, T0 + 90_000).rows).toHaveLength(0)
  })

  test('leitura que voltou depois de outra já aplicada é descartada; sem novidade, nada muda', () => {
    let d = startOverlay(EMPTY_OVERLAY, T0, 's1', tail(0, []))
    d = appendTail(d, 's1', 0, tail(10, [buy(T0 + 1000, 100, 100)]))
    expect(appendTail(d, 's1', 0, tail(10, [buy(T0 + 1000, 100, 100)]))).toBe(d)
    expect(appendTail(d, 's1', 10, tail(10, []))).toBe(d)
    expect(appendTail(d, 'outra', 10, tail(30, ['x']))).toBe(d)
  })

  test('saldo próprio ancorado no momento em que foi definido', () => {
    let d = setOverlayBalance(EMPTY_OVERLAY, 1_000_000, T0 - 10, 'a1')
    d = startOverlay(d, T0, 's1', tail(0, []))
    d = appendTail(d, 's1', 0, tail(10, [buy(T0 + 1000, 2760, 3200)]))
    expect(view(d, T0 + 60_000).balance).toBe(1_000_000 - 2760)
    d = setOverlayBalance(d, 2_000_000, T0 + 70_000, 'a2')
    expect(view(d, T0 + 80_000).balance).toBe(2_000_000)
  })

  test('definir o saldo logo depois de uma operação ainda não confirmada não conta a operação duas vezes', () => {
    let d = startOverlay(EMPTY_OVERLAY, T0, 's1', tail(0, []))
    d = appendTail(d, 's1', 0, tail(10, [buy(T0 + 1000, 50_000, 100)]))
    d = setOverlayBalance(d, 950_000, T0 + 5000, 'a1')
    expect(view(d, T0 + 6000).balance).toBe(950_000)
    const later = view(d, T0 + 60_000)
    expect(later.balance).toBe(950_000)
    expect(later.rows.find((r) => r.op === 'adjust')?.amount).toBe(1_000_000)
  })

  test('jogo reiniciado (novo Game.log): continua do começo do arquivo novo, sem perder o que já tinha', () => {
    let d = startOverlay(EMPTY_OVERLAY, T0, 's1', tail(100, []))
    d = appendTail(d, 's1', 100, tail(200, [buy(T0 + 1000, 100, 100)]))
    d = appendTail(d, 's1', 200, tail(50, [buy(T0 + 5000, 300, 100)], 'f2'))
    expect(d.sessions[0]).toMatchObject({ fileFirst: 'f2', offset: 50 })
    expect(view(d, T0 + 90_000).rows.map((r) => r.amount)).toEqual([-300, -100])
  })
})

describe('shipName', () => {
  test('usa o nome da UEX quando bate; senão, monta pelo fabricante', () => {
    expect(shipName('DRAK_Ironclad_Assault', ctx.vehicles)).toBe('Drake Ironclad Assault')
    expect(shipName('MISC_Hull_C', [])).toBe('MISC Hull C')
    expect(shipName('ZZZZ_Mystery', [])).toBe('ZZZZ Mystery')
    expect(shipName(null, [])).toBeNull()
  })
})

import { describe, expect, test } from 'vitest'
import { mergeImport, parseGameLog, EMPTY_IMPORT, type RawLogFile } from './gamelog'

const IRON = 'f386a33c-ac9a-400a-a7b8-fe1fc7c8d270'
const FLUORINE = '0e49f648-a7d0-4e5c-80e6-9636bd9a8ed6'

const buy = (at: string, price: number, cscu: number, guid = IRON) =>
  `<${at}> [Notice] <CEntityComponentCommodityUIProvider::SendCommodityBuyRequest> Sending SShopCommodityBuyRequest - playerId[1] shopId[926533495053] shopName[SCShop_Admin_lt_base_g] kioskId[926533495052] price[${price}.000000] shopPricePerCentiSCU[27.600000] resourceGUID[${guid}] autoLoading[1] quantity[${cscu}.000000 cSCU] Cargo Box Data: boxSize[32.000000] | unitAmount[16] [Team_CoreGameplayFeatures][Shops][UI]`
const sell = (at: string, amount: number, scu: number, guid = IRON, box = scu >= 32 ? `[boxSize[32] | unitAmount[${scu / 32}]]` : `[boxSize[${scu}] | unitAmount[1]]`, qty = scu) =>
  `<${at}> [Notice] <CEntityComponentCommodityUIProvider::SendCommoditySellRequest> Sending SShopCommoditySellRequest - playerId[1] shopId[926532819636] shopName[SCShop_Admin_lt_base_g] kioskId[926532819635] amount[${amount}.000000] resourceGUID[${guid}] autoLoading[1] quantity[${qty}] transactionMode[ResourceContainer] Cargo Box Data:  ${box} [Team_CoreGameplayFeatures][Shops][UI]`
const sellError = (at: string) =>
  `<${at}> [Error] <CEntityComponentCommodityUIProvider::RmToken_CommodityTransactionResponse> Commodity Transaction Response Error - playerId[1] result[InsuffientStock] type[Selling] [Team_CoreGameplayFeatures][Shops]`
const start = (at: string, place: string) =>
  `<${at}> [Notice] <Calculate Route> [ItemNavigation][CL][10568] | NOT AUTH | DRAK_Ironclad_Assault_951056760359[951056760359]|CSCItemNavigation::CalculateRoute|Projected Start Location is ${place} for route to destination ObjectContainer_RestStop [Team_CGP4][QuantumTravel]`
const shopBuy = (at: string) =>
  `<${at}> [Notice] <CEntityComponentShopUIProvider::SendShopBuyRequest> Sending SShopBuyRequest - playerId[1] shopId[926574794813] shopName[SCShop_RefineryAdmin_ITEM] kioskId[926574794807] client_price[450.000000] itemClassGUID[03b3db91-0063-4da2-99f7-16b20ede4209] itemName[grin_multitool_01_tractorbeam] quantity[1]  [Team_CoreGameplayFeatures][Shops][UI]`
const shopOk = (at: string, result = 'Success') =>
  `<${at}> [Notice] <CEntityComponentShopUIProvider::RmShopFlowResponse> Received ShopFlowResponse - playerId[1] shopId[926574794813] shopName[SCShop_RefineryAdmin_ITEM] kioskId[926574794807] kioskState[BuyRequestProcessing] result[${result}] type[Buying] [Team_CoreGameplayFeatures][Shops][UI]`
const award = (at: string, n: number) =>
  `<${at}> [Notice] <SHUDEvent_OnNotification> Added notification "Awarded ${n} aUEC: " [22] to queue. New queue size: 2, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]`
const login = (at: string) =>
  `<${at}> [Notice] <AccountLoginCharacterStatus_Character> Character: Pilot_One 1794668472342 - updatedAt 1794668472713 - geid 210417740568 - accountId 3398935 - name Pilot_One - state STATE_CURRENT [Team_GameServices][Login]`

const file = (lines: string[], first = '2026-11-23T20:32:28.425Z', last = '2026-11-23T23:48:45.410Z'): RawLogFile => ({ name: 'Game.log', first, last, lines })
const ms = (iso: string) => Date.parse(iso)

describe('parseGameLog', () => {
  test('compra: total, SCU (centésimos), preço por SCU e mercadoria pelo código', () => {
    const p = parseGameLog(file([buy('2026-11-23T21:55:46.463Z', 1413121, 51200)]))
    expect(p.events).toEqual([
      expect.objectContaining({ kind: 'buy', at: ms('2026-11-23T21:55:46.463Z'), amount: -1413121, scu: 512, resource: IRON }),
    ])
    expect(p.events[0].kind === 'buy' && p.events[0].pricePerScu).toBeCloseTo(2760.0, 1)
  })

  test('venda: total e SCU; vendas recusadas pelo jogo ficam de fora', () => {
    const p = parseGameLog(
      file([
        sell('2026-11-23T21:10:00.099Z', 14624, 32),
        sell('2026-11-23T21:10:08.673Z', 13464, 32),
        sellError('2026-11-23T21:10:09.134Z'),
        sell('2026-11-23T22:14:29.075Z', 1824752, 512, FLUORINE),
      ]),
    )
    expect(p.events.map((e) => [e.kind, e.amount])).toEqual([
      ['sell', 14624],
      ['sell', 1824752],
    ])
    expect(p.events[1]).toMatchObject({ scu: 512, resource: FLUORINE })
  })

  test('SCU da venda vem das caixas (o campo quantity às vezes vem errado)', () => {
    const p = parseGameLog(file([sell('2026-11-23T21:09:51.463Z', 7312, 16, IRON, '[boxSize[16] | unitAmount[1]]', 48)]))
    expect(p.events[0]).toMatchObject({ kind: 'sell', scu: 16, pricePerScu: 457 })
    const two = parseGameLog(file([sell('2026-11-23T21:09:51.463Z', 1000, 0, IRON, '[boxSize[32] | unitAmount[2]] [boxSize[8] | unitAmount[3]]', 5)]))
    expect(two.events[0]).toMatchObject({ scu: 88 })
  })

  test('local estimado: o próximo ponto de partida de salto; sem ele, o anterior', () => {
    const p = parseGameLog(
      file([
        start('2026-11-23T21:00:53.201Z', 'ARC-L4 Faint Glen Station'),
        buy('2026-11-23T21:20:00.000Z', 1000, 100),
        start('2026-11-23T21:29:57.943Z', 'Everus Harbor'),
        sell('2026-11-23T21:50:00.000Z', 2000, 1),
      ]),
    )
    expect(p.events.map((e) => (e.kind === 'buy' || e.kind === 'sell' ? e.place : null))).toEqual(['Everus Harbor', 'Everus Harbor'])
  })

  test('compras em loja só com resposta de sucesso; pagamentos de contrato; nome do jogador; sessão', () => {
    const p = parseGameLog(
      file([
        login('2026-11-23T20:32:48.672Z'),
        shopBuy('2026-11-23T20:41:08.597Z'),
        shopOk('2026-11-23T20:41:09.037Z'),
        shopBuy('2026-11-23T20:42:00.000Z'),
        shopOk('2026-11-23T20:42:00.400Z', 'Failure'),
        award('2026-11-23T20:50:00.000Z', 44500),
      ]),
    )
    expect(p.player).toBe('Pilot_One')
    expect(p.events).toEqual([
      expect.objectContaining({ kind: 'shop', amount: -450, item: 'grin_multitool_01_tractorbeam' }),
      expect.objectContaining({ kind: 'reward', amount: 44500 }),
    ])
    expect(p.session).toEqual({ id: '2026-11-23T20:32:28.425Z', startedAt: ms('2026-11-23T20:32:28.425Z'), endedAt: ms('2026-11-23T23:48:45.410Z') })
  })

  test('linha estranha ou formato desconhecido não quebra nada', () => {
    const p = parseGameLog(file(['lixo', '<2026-11-23T20:00:00.000Z> SendCommodityBuyRequest sem campos']))
    expect(p.events).toEqual([])
  })
})

describe('mergeImport', () => {
  test('o mesmo arquivo ou o Game.log que virou backup não duplica; o mais recente vale', () => {
    const a = parseGameLog(file([buy('2026-11-23T21:55:46.463Z', 1000, 100)], '2026-11-23T20:32:28.425Z', '2026-11-23T22:00:00.000Z'))
    const b = parseGameLog({ ...file([buy('2026-11-23T21:55:46.463Z', 1000, 100), sell('2026-11-23T22:30:00.000Z', 3000, 1)]), name: 'Game Build(1) 23 Nov 26.log' })
    const once = mergeImport(EMPTY_IMPORT, [a], 1)
    const twice = mergeImport(once, [b, a], 2)
    expect(twice.sessions).toHaveLength(1)
    expect(twice.sessions[0].events.map((e) => e.kind)).toEqual(['buy', 'sell'])
    expect(twice.importedAt).toBe(2)
  })

  test('o nome do jogador vem da sessão mais recente que o tem', () => {
    const old = parseGameLog(file([login('2026-11-20T10:00:00.000Z')], '2026-11-20T09:00:00.000Z', '2026-11-20T11:00:00.000Z'))
    const now = parseGameLog(file([], '2026-11-23T09:00:00.000Z', '2026-11-23T11:00:00.000Z'))
    expect(mergeImport(EMPTY_IMPORT, [now, old], 1).player).toBe('Pilot_One')
  })
})

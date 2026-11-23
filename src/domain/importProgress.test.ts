import { describe, expect, test } from 'vitest'
import type { Commodity, PriceRow, Terminal } from '../data/types'
import { terminal } from '../test/fixtures'
import type { ImportData, LogEvent } from './gamelog'
import { importToProgress } from './importProgress'

const IRON = 'f386a33c'
const commodities = [{ id: 30, name: 'Iron' } as Commodity, { id: 31, name: 'Fluorine' } as Commodity]
const terminals: Terminal[] = [
  terminal(1, { displayname: 'Everus Harbor', space_station_name: 'Everus Harbor' }),
  terminal(2, { displayname: 'Lorville CBD', city_name: 'Lorville' }),
  terminal(3, { displayname: 'Lorville TDD', city_name: 'Lorville' }),
]
const row = (id_terminal: number, extra: Partial<PriceRow>) => ({ id: id_terminal, id_commodity: 30, id_terminal, price_buy: 0, price_sell: 0, ...extra }) as PriceRow
const prices = [row(2, { price_sell: 3000 }), row(3, { price_sell: 3560 })]

const ev = (e: Partial<LogEvent> & Pick<LogEvent, 'kind'>): LogEvent => ({ key: `${e.at}|${e.kind}`, at: 1, amount: 0, ...e }) as LogEvent
const imp = (events: LogEvent[]): ImportData => ({
  importedAt: 5,
  player: 'Pilot_One',
  sessions: [{ id: 's1', startedAt: 0, endedAt: 100, player: 'Pilot_One', events }],
})
const ctx = { names: new Map([[IRON, 'Iron']]), commodities, terminals, prices }

describe('importToProgress', () => {
  test('compra vira lançamento de trade com mercadoria da UEX, SCU, preço e terminal estimado', () => {
    const d = importToProgress(imp([ev({ kind: 'buy', at: 10, amount: -2760, resource: IRON, scu: 1, pricePerScu: 2760, place: 'Everus Harbor' })]), ctx)
    expect(d.profile.name).toBe('Pilot_One')
    expect(d.sessions).toEqual([{ id: 's1', startedAt: 0, endedAt: 100 }])
    expect(d.txs).toEqual([
      expect.objectContaining({ amount: -2760, category: 'trade', commodityId: 30, commodityName: 'Iron', scu: 1, pricePerScu: 2760, terminalId: 1, terminalName: '≈ Everus Harbor', sessionId: 's1', kind: 'normal' }),
    ])
  })

  test('vários terminais no mesmo lugar: escolhe o de preço mais próximo', () => {
    const d = importToProgress(imp([ev({ kind: 'sell', at: 10, amount: 3564, resource: IRON, scu: 1, pricePerScu: 3564, place: 'Lorville' })]), ctx)
    expect(d.txs[0]).toMatchObject({ terminalId: 3, terminalName: '≈ Lorville TDD' })
  })

  test('lugar ou mercadoria desconhecidos continuam aparecendo, sem quebrar os resumos', () => {
    const d = importToProgress(
      imp([
        ev({ kind: 'sell', at: 10, amount: 100, resource: 'zzz', scu: 1, pricePerScu: 100, place: 'Somewhere Far' }),
        ev({ kind: 'sell', at: 11, amount: 100, resource: 'zzz', scu: 1, pricePerScu: 100, place: null }),
      ]),
      ctx,
    )
    expect(d.txs[0]).toMatchObject({ commodityName: 'zzz', terminalName: '≈ Somewhere Far' })
    expect(d.txs[0].commodityId).toBe(d.txs[1].commodityId)
    expect(d.txs[0].terminalId).toBeLessThan(0)
    expect(d.txs[1].terminalId).toBeUndefined()
  })

  test('loja, contrato e categorias', () => {
    const d = importToProgress(
      imp([ev({ kind: 'shop', at: 10, amount: -450, item: 'grin_multitool_01_tractorbeam' }), ev({ kind: 'reward', at: 11, amount: 44500 })]),
      ctx,
    )
    expect(d.txs.map((t) => [t.category, t.description, t.amount])).toEqual([
      ['purchase', 'grin_multitool_01_tractorbeam', -450],
      ['other', 'contract', 44500],
    ])
  })
})

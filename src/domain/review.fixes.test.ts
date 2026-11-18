import { describe, expect, test } from 'vitest'
import type { Item } from '../data/types'
import { commodity, price, vehicle } from '../test/fixtures'
import { fleetTotals, type FleetEntry } from './fleet'
import { salvagePlan } from './salvage'
import { applyBuild, buildsFor, cleanItems, pruneSetup, setupCost } from './setup'
import type { WikiItem, WikiPort, WikiVehicle } from './wiki'

const port = (path: string, type: string, extra: Partial<WikiPort> = {}): WikiPort => ({
  path, name: path.split('/').pop()!, type, subType: '', minSize: 1, maxSize: 2, editable: true,
  equippedUuid: null, equippedName: null, requiredTags: [], ports: [], ...extra,
})
const item = (uuid: string, type: string, stats: Record<string, number> = {}, extra: Partial<WikiItem> = {}): WikiItem => ({
  uuid, name: uuid, className: uuid, type, subType: '', size: 1, manufacturer: null, tags: [], ports: [], stats, active: false, charges: null, ...extra,
})

// Nave de salvage: cabeça de fábrica sem atributos e um módulo de fábrica que já é o melhor.
const head = port('arm/head', 'SalvageHead', {
  equippedUuid: 'baler',
  ports: [port('arm/head/sub1', 'SalvageModifier', { equippedUuid: 'fast', maxSize: 1 })],
})
const salvageShip: WikiVehicle = { uuid: 's', name: 'S', role: null, description: null, msrp: null, ports: [head] }
const salvageItems = [item('baler', 'SalvageHead'), item('other-head', 'SalvageHead'), item('fast', 'SalvageModifier', { salvage_speed: 2 }), item('slow', 'SalvageModifier', { salvage_speed: 1 })]

describe('builds não gravam o item de fábrica como troca', () => {
  test('cabeça e módulo de fábrica já melhores: setup vazio e custo zero', () => {
    const speed = buildsFor(salvageShip, salvageItems, 1, new Map()).find((b) => b.id === 'salvage-speed')!
    expect(speed.setup).toEqual({})
    expect(setupCost(speed.setup, new Map(), [])).toEqual({ total: 0, missing: 0 })
  })
})

describe('pruneSetup sem a lista de itens', () => {
  test('mantém os módulos de um laser trocado que ainda não carregou', () => {
    const laser = port('t/laser', 'WeaponMining', { equippedUuid: 'stock' })
    const ship: WikiVehicle = { uuid: 'm', name: 'M', role: null, description: null, msrp: null, ports: [laser] }
    const setup = { 't/laser': 'custom', 't/laser/BONE_1': 'focus' }
    expect(pruneSetup(setup, ship, new Map())).toEqual(setup)
  })
})

describe('cleanItems', () => {
  test('tira variantes de teste e repetidas pelo nome, preferindo a de fábrica ou a do UEX', () => {
    const items = [
      item('a-test', 'WeaponMining', {}, { name: 'Arbor MH1 Mining Laser', className: 'Mining_Laser_GRIN_Arbor_S1_Test_Active_1' }),
      item('a-arm', 'WeaponMining', {}, { name: 'Arbor MH1 Mining Laser', className: 'Mining_Laser_MPUV_Arm' }),
      item('a-real', 'WeaponMining', {}, { name: 'Arbor MH1 Mining Laser', className: 'GRIN_MiningLaser_S1' }),
      item('i-best', 'WeaponMining', {}, { name: 'Impact II Mining Laser', className: 'Mining_Laser_TEST_Best' }),
      item('i-real', 'WeaponMining', {}, { name: 'Impact II Mining Laser', className: 'THCN_MiningLaser_S2' }),
    ]
    const uex = new Map<string, Item>([['a-real', { id: 1, uuid: 'a-real', id_category: 29, name: 'Arbor MH1 Mining Laser', company_name: null, size: '1', category: '' }]])
    expect(cleanItems(items, new Set(), uex).map((i) => i.uuid).sort()).toEqual(['a-real', 'i-real'])
    expect(cleanItems(items, new Set(['a-arm']), uex).map((i) => i.uuid).sort()).toEqual(['a-arm', 'i-real'])
  })
})

describe('applyBuild', () => {
  test('troca só os encaixes da função da build', () => {
    const laser = port('t/laser', 'WeaponMining', { equippedUuid: 'stock' })
    const tractor = port('tb', 'TractorBeam', { equippedUuid: 'grip' })
    const ship: WikiVehicle = { uuid: 'x', name: 'X', role: null, description: null, msrp: null, ports: [laser, tractor] }
    const current = { tb: 'grip-hv', 't/laser': 'old', 't/laser/BONE_1': 'focus' }
    expect(applyBuild(current, { id: 'mining-power', fn: 'mining', nameKey: '', criterionKey: '', setup: { 't/laser': 'strong' } }, ship)).toEqual({ tb: 'grip-hv', 't/laser': 'strong' })
  })
})

describe('fleetTotals', () => {
  test('nave desconhecida não entra na contagem de naves', () => {
    const e = (id: string, vehicleId: number): FleetEntry => ({ id, vehicleId, nickname: '', note: '', addedAt: 0, setup: {} })
    const t = fleetTotals([e('a', 1), e('b', 9999)], new Map([[1, vehicle(1, 'A', 1)]]), [], [])
    expect(t.count).toBe(1)
    expect(t.unknown).toBe(1)
  })
})

describe('salvagePlan com o mesmo material em duas linhas', () => {
  test('soma as linhas antes de comparar com a demanda', () => {
    const RMC = commodity(63, 'RMC')
    const rows = salvagePlan([{ commodityId: RMC.id, scu: 60 }, { commodityId: RMC.id, scu: 60 }], [price(63, 1, { price_sell: 100, scu_sell: 100 })], () => null, 'value')
    expect(rows[0].short).toEqual([63])
    expect(rows[0].value).toBe(12_000)
  })
})

import { describe, expect, test } from 'vitest'
import type { Item, ItemPrice } from '../data/types'
import mole from '../test/wiki/mole.json'
import vulture from '../test/wiki/vulture.json'
import { buildsFor, childPorts, fits, functionsOf, industrialSlots, pruneSetup, setupCost } from './setup'
import { normalizeVehicle, type WikiItem, type WikiPort, type WikiVehicle } from './wiki'

const port = (path: string, type: string, min: number, max: number, extra: Partial<WikiPort> = {}): WikiPort => ({
  path, name: path.split('/').pop()!, type, subType: 'Gun', minSize: min, maxSize: max, editable: true,
  equippedUuid: null, equippedName: null, requiredTags: [], ports: [], ...extra,
})
const item = (uuid: string, type: string, size: number, stats: Record<string, number> = {}, extra: Partial<WikiItem> = {}): WikiItem => ({
  uuid, name: uuid, type, subType: 'Gun', size, manufacturer: null, tags: ['miningMount', 'miningConsumable'], ports: [], stats, active: false, charges: null, ...extra,
})
const modPorts = (n: number) => Array.from({ length: n }, (_, i) => port(`BONE_ItemPort_Consumable_${i + 1}`, 'MiningModifier', 1, 1))

// Nave com 1 laser S1 de fábrica (stock), que tem 1 encaixe de módulo.
const ship: WikiVehicle = {
  uuid: 'ship', name: 'Test', role: 'Light Mining', description: null, msrp: null,
  ports: [port('turret', 'UtilityTurret', 1, 1, { editable: false, ports: [port('turret/laser', 'WeaponMining', 1, 1, { equippedUuid: 'stock', requiredTags: ['miningMount'] })] }), port('gun', 'WeaponGun', 1, 1)],
}
const stock = item('stock', 'WeaponMining', 1, { power_max: 1000, laser_instability: 0, optimal_charge_window_size: 0 }, { ports: modPorts(1) })
const stable = item('stable', 'WeaponMining', 1, { power_max: 900, laser_instability: -10, optimal_charge_window_size: 20 }, { ports: modPorts(2) })
const strong = item('strong', 'WeaponMining', 1, { power_max: 2000, laser_instability: 15 }, { ports: modPorts(1) })
const big = item('big', 'WeaponMining', 2, { power_max: 9999 })
const focus = item('focus', 'MiningModifier', 1, { optimal_charge_window_size: 40, power_modifier: -0.05 })
const rieger = item('rieger', 'MiningModifier', 1, { power_modifier: 0.15 })
const brandt = item('brandt', 'MiningModifier', 1, { power_modifier: 0.35, resistance: 15 }, { active: true, charges: 5 })
const items = [stock, stable, strong, big, focus, rieger, brandt]
const byUuid = new Map(items.map((i) => [i.uuid, i]))
const noUex = new Map<string, Item>()

describe('industrialSlots e functionsOf', () => {
  test('Mole: 3 lasers de mineração, nada de combate ou salvage', () => {
    const v = normalizeVehicle(mole.data)
    const slots = industrialSlots(v)
    expect(slots.map((s) => s.label)).toEqual(['Laser 1', 'Laser 2', 'Laser 3'])
    expect(slots.every((s) => s.fn === 'mining' && s.port.type === 'WeaponMining')).toBe(true)
    expect(functionsOf(v)).toEqual(['mining'])
  })

  test('Vulture: 2 salvage heads', () => {
    const v = normalizeVehicle(vulture.data)
    expect(industrialSlots(v).map((s) => s.label)).toEqual(['Salvage Head 1', 'Salvage Head 2'])
    expect(functionsOf(v)).toEqual(['salvage'])
  })

  test('nave só com armas: nenhuma função e nenhuma build', () => {
    const guns: WikiVehicle = { ...ship, ports: [port('gun', 'WeaponGun', 1, 1)] }
    expect(functionsOf(guns)).toEqual([])
    expect(buildsFor(guns, items, 1, noUex)).toEqual([])
  })
})

describe('fits', () => {
  const laserPort = ship.ports[0].ports[0]
  test('tamanho fora do encaixe não cabe', () => expect(fits(big, laserPort, 1, noUex)).toBe(false))
  test('tipo diferente não cabe', () => expect(fits(focus, laserPort, 1, noUex)).toBe(false))
  test('falta a tag exigida', () => expect(fits({ ...stable, tags: [] }, laserPort, 1, noUex)).toBe(false))
  test('item exclusivo de outra nave não cabe; da própria nave cabe', () => {
    const uex = new Map<string, Item>([['stable', { id: 1, uuid: 'stable', id_vehicle: 99, id_category: 29, name: 'x', company_name: null, size: '1', category: '' }]])
    expect(fits(stable, laserPort, 1, uex)).toBe(false)
    expect(fits(stable, laserPort, 99, uex)).toBe(true)
  })
  test('sub-tipo específico: só o mesmo sub-tipo', () => {
    const tractorPort = port('h/sub2', 'SalvageModifier', 1, 1, { subType: 'SalvageModifier_TractorBeam' })
    const scraper = item('scr', 'SalvageModifier', 1, {}, { subType: '', tags: [] })
    const grip = item('grip', 'SalvageModifier', 1, {}, { subType: 'SalvageModifier_TractorBeam', tags: [] })
    expect(fits(scraper, tractorPort, 1, noUex)).toBe(false)
    expect(fits(grip, tractorPort, 1, noUex)).toBe(true)
  })
})

describe('childPorts e pruneSetup', () => {
  const laserPort = ship.ports[0].ports[0]
  test('de fábrica usa os encaixes do laser de fábrica; trocado usa os do novo', () => {
    expect(childPorts(laserPort, {}, byUuid).map((p) => p.path)).toEqual(['turret/laser/BONE_ItemPort_Consumable_1'])
    expect(childPorts(laserPort, { 'turret/laser': 'stable' }, byUuid)).toHaveLength(2)
  })

  test('trocar para laser com menos encaixes remove o módulo que sobrou', () => {
    const setup = {
      'turret/laser': 'strong',
      'turret/laser/BONE_ItemPort_Consumable_1': 'focus',
      'turret/laser/BONE_ItemPort_Consumable_2': 'focus',
    }
    expect(pruneSetup(setup, ship, byUuid)).toEqual({ 'turret/laser': 'strong', 'turret/laser/BONE_ItemPort_Consumable_1': 'focus' })
  })

  test('caminho que não existe na nave sai', () => {
    expect(pruneSetup({ nope: 'focus' }, ship, byUuid)).toEqual({})
  })
})

describe('buildsFor', () => {
  const builds = buildsFor(ship, items, 1, noUex)
  const get = (id: string) => builds.find((b) => b.id === id)!

  test('mineração tem estável, potência e equilibrada; nada de salvage', () => {
    expect(builds.map((b) => b.id)).toEqual(['mining-stable', 'mining-power', 'mining-balanced'])
  })

  test('estável escolhe menos instabilidade e janela maior, e módulo passivo de janela', () => {
    const s = get('mining-stable').setup
    expect(s['turret/laser']).toBe('stable')
    expect(s['turret/laser/BONE_ItemPort_Consumable_1']).toBe('focus')
    expect(s['turret/laser/BONE_ItemPort_Consumable_2']).toBe('focus')
  })

  test('potência escolhe maior potência; módulo ativo só se nenhum passivo ajuda', () => {
    const s = get('mining-power').setup
    expect(s['turret/laser']).toBe('strong')
    expect(s['turret/laser/BONE_ItemPort_Consumable_1']).toBe('rieger')
  })

  test('módulo ativo entra quando nenhum passivo melhora o critério', () => {
    const only = buildsFor(ship, [stock, strong, focus, brandt], 1, noUex).find((b) => b.id === 'mining-power')!
    expect(only.setup['turret/laser/BONE_ItemPort_Consumable_1']).toBe('brandt')
  })

  test('salvage: velocidade e eficiência', () => {
    const v = normalizeVehicle(vulture.data)
    expect(buildsFor(v, [], 1, noUex).map((b) => b.id)).toEqual(['salvage-speed', 'salvage-efficiency'])
  })
})

describe('setupCost', () => {
  test('soma o menor preço de cada item e conta os sem preço', () => {
    const uex = new Map<string, Item>([
      ['stable', { id: 10, uuid: 'stable', id_category: 29, name: 'Stable', company_name: null, size: '1', category: '' }],
      ['focus', { id: 11, uuid: 'focus', id_category: 30, name: 'Focus', company_name: null, size: '1', category: '' }],
    ])
    const p = (id_item: number, price_buy: number): ItemPrice => ({ id: id_item * 10 + price_buy, id_item, id_terminal: 1, price_buy, date_modified: 1, item_name: '', terminal_name: '' })
    const prices = [p(10, 5000), p(10, 4000), p(11, 0)]
    expect(setupCost({ a: 'stable', b: 'focus', c: 'nope' }, uex, prices)).toEqual({ total: 4000, missing: 2 })
  })
})

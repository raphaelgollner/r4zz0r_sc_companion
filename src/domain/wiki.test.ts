import { describe, expect, test } from 'vitest'
import abrade from '../test/wiki/abrade.json'
import brandt from '../test/wiki/brandt.json'
import focus from '../test/wiki/focus-iii.json'
import lancet from '../test/wiki/lancet-mh2.json'
import mole from '../test/wiki/mole.json'
import vulture from '../test/wiki/vulture.json'
import { findPort, normalizeItem, normalizeVehicle } from './wiki'

describe('normalizeVehicle', () => {
  test('Mole: papel, msrp, descrição e caminhos aninhados', () => {
    const v = normalizeVehicle(mole.data)
    expect(v.role).toBe('Medium Mining')
    expect(v.msrp).toBe(315)
    expect(v.description).toMatch(/ARGO/)
    const p = findPort(v.ports, 'hardpoint_mining_cab_left/hardpoint_weapon_mining')
    expect(p).toMatchObject({ type: 'WeaponMining', minSize: 2, maxSize: 2, editable: true, equippedName: 'Arbor MH2 Mining Laser', requiredTags: ['miningMount'] })
  })

  test('Vulture: sub_type UNDEFINED vira vazio, tipo específico continua', () => {
    const v = normalizeVehicle(vulture.data)
    const head = findPort(v.ports, 'hardpoint_salvage_arm_left/hardpoint_salvage_laser')!
    expect(head.type).toBe('SalvageHead')
    expect(head.subType).toBe('')
    expect(head.ports.map((c) => c.subType)).toEqual(['', 'SalvageModifier_TractorBeam'])
  })

  test('entrada vazia não quebra', () => {
    expect(normalizeVehicle({})).toEqual({ uuid: '', name: '', role: null, description: null, msrp: null, ports: [] })
    expect(normalizeVehicle(null).ports).toEqual([])
  })
})

describe('normalizeItem', () => {
  test('laser: potência, slots e modificadores', () => {
    const i = normalizeItem(lancet.data)
    expect(i).toMatchObject({ name: 'Lancet MH2 Mining Laser', type: 'WeaponMining', size: 2, active: false, charges: null })
    expect(i.stats.laser_instability).toBe(-10)
    expect(i.stats.module_slots).toBe(2)
    expect(i.stats.power_max).toBeGreaterThan(0)
    expect(i.ports.filter((p) => p.type === 'MiningModifier')).toHaveLength(2)
  })

  test('módulo passivo e ativo', () => {
    const f = normalizeItem(focus.data)
    expect(f.active).toBe(false)
    expect(f.stats.optimal_charge_window_size).toBe(40)
    const b = normalizeItem(brandt.data)
    expect(b.active).toBe(true)
    expect(b.charges).toBe(5)
    expect(b.stats.salvage_speed).toBeUndefined()
  })

  test('salvage: velocidade e eficiência', () => {
    const a = normalizeItem(abrade.data)
    expect(a.stats).toMatchObject({ salvage_speed: 0.15, extraction_efficiency: 0.9, radius: 3.5 })
    expect(a.manufacturer).toBe('Greycat Industrial')
  })

  test('entrada vazia não quebra', () => {
    expect(normalizeItem({})).toMatchObject({ uuid: '', size: 0, stats: {}, ports: [], tags: [] })
  })
})

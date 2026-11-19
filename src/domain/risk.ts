import type { Terminal } from '../data/types'

/**
 * Nível de perigo estimado de um terminal, pela facção que controla o local segundo o UEX.
 * É uma estimativa: não sabe de jogadores, interdições ou eventos no momento.
 */
export type Risk = 'safe' | 'medium' | 'risky' | 'dangerous'
export type MaxRisk = Risk | 'any'

export const RISKS: Risk[] = ['safe', 'medium', 'risky', 'dangerous']

const HOSTILE = ['nine tails', 'headhunters', 'xenothreat', 'dusters', 'rough & ready']
const OUTSIDE_LAW = ['citizens for prosperity', "people's alliance"]

export function riskOf(t: Terminal | undefined): Risk | null {
  if (!t) return null
  const faction = (t.faction_name ?? '').trim().toLowerCase()
  const system = t.star_system_name ?? ''
  if (HOSTILE.includes(faction)) return 'dangerous'
  if (OUTSIDE_LAW.includes(faction)) return 'risky'
  if (faction === 'united empire of earth') {
    if (system !== 'Stanton') return 'medium'
    return t.city_name || t.space_station_name ? 'safe' : 'medium'
  }
  if (faction) return 'risky'
  if (system === 'Stanton') return 'medium'
  if (system === 'Nyx') return 'risky'
  return 'dangerous'
}

/** O nível está dentro do máximo aceito? Sem nível conhecido, sempre passa. */
export function riskAllowed(risk: Risk | null, max: MaxRisk): boolean {
  if (max === 'any' || risk === null) return true
  return RISKS.indexOf(risk) <= RISKS.indexOf(max)
}

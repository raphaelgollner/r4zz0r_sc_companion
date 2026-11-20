import { afterEach, describe, expect, test } from 'vitest'
import { applyTheme, isThemeId, THEMES } from './themes'

const root = () => document.documentElement.style

describe('temas', () => {
  afterEach(() => applyTheme('cargo'))

  test('todos os temas pedidos e os extras existem, com TAYKO CARGO primeiro', () => {
    expect(THEMES.map((t) => t.name)).toEqual([
      'TAYKO CARGO', 'TAYKO MINER', 'TAYKO SALVAGE', 'SLIME', 'PINKY WINKY', 'DRAKE', 'RSI', 'ARGO',
      'AEGIS', 'ANVIL', 'ORIGIN', 'CRUSADER', 'MISC', 'NINE TAILS',
    ])
  })

  test('cada tema define todas as cores em formato válido, e o rgb bate com o hex', () => {
    const hex = /^#[0-9a-f]{6}$/i
    for (const t of THEMES) {
      for (const k of ['gold', 'goldLight', 'goldDark', 'orange', 'orangeLight', 'accent', 'black', 'panel'] as const) expect(t.colors[k], `${t.id}.${k}`).toMatch(hex)
      const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(', ')
      expect(t.vars['--gold-rgb']).toBe(rgb(t.colors.gold))
      expect(t.vars['--orange-rgb']).toBe(rgb(t.colors.orange))
    }
  })

  test('applyTheme grava as variáveis no :root; id desconhecido cai no padrão', () => {
    applyTheme('miner')
    expect(root().getPropertyValue('--gold')).toBe(THEMES.find((t) => t.id === 'miner')!.colors.gold)
    applyTheme('nope' as never)
    expect(root().getPropertyValue('--gold')).toBe('#f4c430')
  })

  test('cores com significado não fazem parte do tema', () => {
    for (const t of THEMES) for (const k of Object.keys(t.vars)) expect(['--profit', '--danger']).not.toContain(k)
  })

  test('isThemeId', () => {
    expect(isThemeId('slime')).toBe(true)
    expect(isThemeId('xpto')).toBe(false)
  })
})

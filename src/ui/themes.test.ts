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

  test('cores com significado só mudam no tema claro, e no mesmo tom (só mais escuras para ler no claro)', () => {
    const semantic = { '--profit': '#3ddc84', '--danger': '#ff4d4d', '--warn': '#ff8c00', '--info': '#5fb4ff' }
    for (const t of THEMES) {
      for (const [k, base] of Object.entries(semantic)) {
        if (!t.light) expect(t.vars[k], `${t.id} ${k}`).toBeUndefined()
        else {
          const d = Math.abs(hsl(t.vars[k]).h - hsl(base).h)
          expect(Math.min(d, 360 - d), `${t.id} ${k}`).toBeLessThan(15)
          expect(contrast(t.vars[k], t.colors.black), `${t.id} ${k}`).toBeGreaterThan(3)
        }
      }
    }
  })

  test('isThemeId', () => {
    expect(isThemeId('slime')).toBe(true)
    expect(isThemeId('xpto')).toBe(false)
  })

  test('DRAKE é escuro e vermelho, bem diferente do TAYKO CARGO', () => {
    const drake = THEMES.find((t) => t.id === 'drake')!.colors
    const hsl = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
      const h = d === 0 ? 0 : max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
      return { h: (h * 60 + 360) % 360, l: (max + min) / 2 }
    }
    const h = hsl(drake.gold).h
    expect(h < 12 || h > 345).toBe(true)
    expect(hsl(drake.black).l).toBeLessThan(0.04)
    expect(hsl(drake.panel).l).toBeLessThan(0.08)
    expect(hsl(drake.orange).h === 0 || Math.abs(parseInt(drake.orange.slice(1, 3), 16) - parseInt(drake.orange.slice(5, 7), 16)) < 24).toBe(true)
  })

  test('o logo da Tayko Corp nunca muda de cor: nenhum tema mexe nele', () => {
    for (const t of THEMES) expect(Object.keys(t.vars).filter((k) => k.includes('logo'))).toEqual([])
  })

  test('fundos variam: alguns temas em cinza-escuro, os escuros continuam pretos', () => {
    const page = (id: string) => hsl(THEMES.find((t) => t.id === id)!.colors.black).l
    for (const id of ['cargo', 'miner', 'drake', 'ninetails']) expect(page(id), id).toBeLessThan(0.05)
    const grays = THEMES.filter((t) => !t.light && hsl(t.colors.black).l >= 0.08)
    expect(grays.length).toBeGreaterThanOrEqual(3)
  })

  test('ORIGIN é um modo claro (gelo) com texto escuro bem legível', () => {
    const o = THEMES.find((t) => t.id === 'origin')!
    expect(o.light).toBe(true)
    expect(hsl(o.colors.black).l).toBeGreaterThan(0.88)
    expect(o.vars['color-scheme']).toBe('light')
    expect(contrast(o.vars['--white'], o.colors.black)).toBeGreaterThan(10)
    expect(contrast(o.vars['--muted'], o.colors.panel)).toBeGreaterThan(4.5)
    expect(contrast(o.vars['--on-accent'], o.colors.gold)).toBeGreaterThan(4.5)
    expect(contrast(o.colors.gold, o.colors.panel)).toBeGreaterThan(3)
  })

  test('texto sobre o destaque é legível em todos os temas', () => {
    for (const t of THEMES) expect(contrast(t.vars['--on-accent'] ?? '#0a0a0f', t.colors.gold), t.id).toBeGreaterThan(4.5)
  })
})

function hsl(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
  const h = d === 0 ? 0 : max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return { h: (h * 60 + 360) % 360, l: (max + min) / 2 }
}

function contrast(a: string, b: string) {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl
  }
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m)
  return (x + 0.05) / (y + 0.05)
}

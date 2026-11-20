/**
 * Temas de cor: trocam só as variáveis de paleta do `theme.css` (destaque, secundário, fundos, brilho e o tom do logo).
 * Cores com significado (lucro/prejuízo, níveis de perigo, marcações) não entram aqui e ficam iguais em todos os temas.
 */
export type ThemeId =
  | 'cargo' | 'miner' | 'salvage' | 'slime' | 'pinky' | 'drake' | 'rsi' | 'argo'
  | 'aegis' | 'anvil' | 'origin' | 'crusader' | 'misc' | 'ninetails'

interface Palette {
  /** Destaque principal (o dourado do tema padrão). */
  gold: string
  goldLight: string
  goldDark: string
  /** Secundário (o laranja do tema padrão). */
  orange: string
  orangeLight: string
  accent: string
  /** Fundo da página e dos painéis. */
  black: string
  panel: string
}

export interface Theme {
  id: ThemeId
  name: string
  colors: Palette
  /** Variáveis CSS gravadas no :root. */
  vars: Record<string, string>
}

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')

function theme(id: ThemeId, name: string, colors: Palette, logoFilter: string): Theme {
  return {
    id,
    name,
    colors,
    vars: {
      '--gold': colors.gold,
      '--gold-light': colors.goldLight,
      '--gold-dark': colors.goldDark,
      '--orange': colors.orange,
      '--orange-light': colors.orangeLight,
      '--accent': colors.accent,
      '--black': colors.black,
      '--panel': colors.panel,
      '--gold-rgb': rgb(colors.gold),
      '--orange-rgb': rgb(colors.orange),
      '--panel-rgb': rgb(colors.panel),
      '--black-rgb': rgb(colors.black),
      '--glow-gold': `rgba(${rgb(colors.gold)}, 0.5)`,
      '--glow-soft': `rgba(${rgb(colors.gold)}, 0.15)`,
      '--logo-filter': logoFilter,
    },
  }
}

export const THEMES: Theme[] = [
  theme('cargo', 'TAYKO CARGO', { gold: '#f4c430', goldLight: '#ffd700', goldDark: '#c9a22b', orange: '#ff8c00', orangeLight: '#ffa500', accent: '#ff6b00', black: '#0a0a0f', panel: '#0f0f1a' }, 'saturate(1)'),
  theme('miner', 'TAYKO MINER', { gold: '#ff6a3d', goldLight: '#ff9166', goldDark: '#c2401f', orange: '#ffb03a', orangeLight: '#ffc766', accent: '#ff3b1f', black: '#0f0908', panel: '#1a0f0d' }, 'hue-rotate(-32deg) saturate(1.3)'),
  theme('salvage', 'TAYKO SALVAGE', { gold: '#22c7ff', goldLight: '#7ee3ff', goldDark: '#1592b8', orange: '#4f7bff', orangeLight: '#7d9dff', accent: '#2f5bff', black: '#070a12', panel: '#0c1220' }, 'hue-rotate(150deg) saturate(1.2)'),
  theme('slime', 'SLIME', { gold: '#9cff2e', goldLight: '#c4ff6b', goldDark: '#6fbf1c', orange: '#e1ff3c', orangeLight: '#f0ff85', accent: '#5fe000', black: '#080d06', panel: '#0e160c' }, 'hue-rotate(42deg) saturate(1.4)'),
  theme('pinky', 'PINKY WINKY', { gold: '#ff5fb7', goldLight: '#ff94d0', goldDark: '#c43d88', orange: '#d65bff', orangeLight: '#e48bff', accent: '#ff3d9a', black: '#0f080d', panel: '#1a0d17' }, 'hue-rotate(-79deg) saturate(1.2)'),
  theme('drake', 'DRAKE', { gold: '#ffcc00', goldLight: '#ffe066', goldDark: '#b8920a', orange: '#c8551b', orangeLight: '#e0763d', accent: '#e0601a', black: '#0b0b0b', panel: '#151515' }, 'saturate(1.2)'),
  theme('rsi', 'RSI', { gold: '#4aa8ff', goldLight: '#8cc9ff', goldDark: '#2d6fb0', orange: '#dce8f5', orangeLight: '#ffffff', accent: '#6fb8ff', black: '#050a14', panel: '#0a1426' }, 'hue-rotate(163deg)'),
  theme('argo', 'ARGO', { gold: '#ff8a1c', goldLight: '#ffab5c', goldDark: '#c4650f', orange: '#ffd23f', orangeLight: '#ffe27a', accent: '#ff6a00', black: '#0c0c0d', panel: '#18191b' }, 'hue-rotate(-18deg) saturate(1.2)'),
  theme('aegis', 'AEGIS', { gold: '#c8323c', goldLight: '#e0606a', goldDark: '#8f1f27', orange: '#a9b4bf', orangeLight: '#cfd8e0', accent: '#e04848', black: '#0a0b0d', panel: '#14171b' }, 'hue-rotate(-51deg) saturate(1.1)'),
  theme('anvil', 'ANVIL', { gold: '#a8b45a', goldLight: '#c8d27e', goldDark: '#6f7a33', orange: '#d8c08a', orangeLight: '#eadbb0', accent: '#b9a35c', black: '#0b0c08', panel: '#141610' }, 'hue-rotate(21deg) saturate(0.6)'),
  theme('origin', 'ORIGIN', { gold: '#e8d3a8', goldLight: '#f6ead0', goldDark: '#b39b6c', orange: '#cfd6de', orangeLight: '#ffffff', accent: '#d9bf8a', black: '#0c0b0a', panel: '#171512' }, 'saturate(0.45) brightness(1.15)'),
  theme('crusader', 'CRUSADER', { gold: '#7cc4ff', goldLight: '#b0dcff', goldDark: '#4a8cc4', orange: '#f2f7ff', orangeLight: '#ffffff', accent: '#5aaef5', black: '#08101b', panel: '#0d1828' }, 'hue-rotate(162deg) saturate(0.8)'),
  theme('misc', 'MISC', { gold: '#2ec4b6', goldLight: '#6fe0d5', goldDark: '#1f8a80', orange: '#f0f4f2', orangeLight: '#ffffff', accent: '#23a89c', black: '#060d0d', panel: '#0c1716' }, 'hue-rotate(128deg)'),
  theme('ninetails', 'NINE TAILS', { gold: '#b44dff', goldLight: '#d08cff', goldDark: '#7a2fb3', orange: '#ff3dd4', orangeLight: '#ff7ae3', accent: '#9b3dff', black: '#0b0710', panel: '#150d1d' }, 'hue-rotate(229deg) saturate(1.3)'),
]

export const DEFAULT_THEME: ThemeId = 'cargo'

export const isThemeId = (v: unknown): v is ThemeId => THEMES.some((t) => t.id === v)

/** Grava as variáveis do tema no :root. Id desconhecido usa o padrão. */
export function applyTheme(id: ThemeId) {
  const t = THEMES.find((x) => x.id === id) ?? THEMES[0]
  const style = document.documentElement.style
  for (const [k, v] of Object.entries(t.vars)) style.setProperty(k, v)
  document.documentElement.dataset.theme = t.id
}

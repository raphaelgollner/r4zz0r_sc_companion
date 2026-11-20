/**
 * Temas de cor: trocam só as variáveis de paleta do `theme.css` (destaque, secundário, fundos, superfícies e brilho).
 * O logo da Tayko Corp nunca muda: é sempre o do TAYKO CARGO.
 * Cores com significado (lucro, perigo, aviso, MEDIANO) só mudam no tema claro, e no mesmo tom, mais escuras para ler no claro.
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

/** Superfícies (campos, cards, bordas, grade do fundo). Sem isso, valem as do tema padrão. */
interface Surfaces {
  darkGray: string
  midGray: string
  lightGray: string
}

/** Só para tema claro: texto escuro e cores com significado mais escuras (mesmo tom). */
interface LightMode {
  text: string
  muted: string
  steel: string
  profit: string
  danger: string
  warn: string
  warnLight: string
  info: string
}

export interface Theme {
  id: ThemeId
  name: string
  light: boolean
  colors: Palette
  /** Variáveis CSS gravadas no :root. */
  vars: Record<string, string>
}

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Texto sobre o destaque (aba ativa, botão principal): preto ou branco, o que tiver mais contraste. */
function onAccent(hex: string) {
  const l = luminance(hex)
  return 1.05 / (l + 0.05) > (l + 0.05) / 0.0546 ? '#ffffff' : '#0a0a0f'
}

const DEFAULT_SURFACES: Surfaces = { darkGray: '#1a1a1a', midGray: '#2a2a2a', lightGray: '#3a3a3a' }

function theme(id: ThemeId, name: string, colors: Palette, surfaces: Surfaces = DEFAULT_SURFACES, light?: LightMode): Theme {
  const vars: Record<string, string> = {
    '--gold': colors.gold,
    '--gold-light': colors.goldLight,
    '--gold-dark': colors.goldDark,
    '--orange': colors.orange,
    '--orange-light': colors.orangeLight,
    '--accent': colors.accent,
    '--black': colors.black,
    '--panel': colors.panel,
    '--dark-gray': surfaces.darkGray,
    '--mid-gray': surfaces.midGray,
    '--light-gray': surfaces.lightGray,
    '--gold-rgb': rgb(colors.gold),
    '--orange-rgb': rgb(colors.orange),
    '--panel-rgb': rgb(colors.panel),
    '--black-rgb': rgb(colors.black),
    '--dark-gray-rgb': rgb(surfaces.darkGray),
    '--mid-gray-rgb': rgb(surfaces.midGray),
    '--glow-gold': `rgba(${rgb(colors.gold)}, 0.5)`,
    '--glow-soft': `rgba(${rgb(colors.gold)}, 0.15)`,
    '--on-accent': onAccent(colors.gold),
    // Escuros: texto claro e sombras pretas (os mesmos valores do :root).
    '--white': '#e8e8e8',
    '--muted': '#8b8b95',
    '--steel': '#9aa3ad',
    '--shadow-rgb': '0, 0, 0',
    '--backdrop-rgb': '5, 5, 8',
    'color-scheme': 'dark',
  }
  if (light)
    Object.assign(vars, {
      '--white': light.text,
      '--muted': light.muted,
      '--steel': light.steel,
      '--profit': light.profit,
      '--danger': light.danger,
      '--warn': light.warn,
      '--warn-light': light.warnLight,
      '--warn-rgb': rgb(light.warn),
      '--info': light.info,
      '--shadow-rgb': '90, 100, 115',
      '--backdrop-rgb': '40, 46, 56',
      'color-scheme': 'light',
    })
  return { id, name, light: !!light, colors, vars }
}

const gray = (darkGray: string, midGray: string, lightGray: string): Surfaces => ({ darkGray, midGray, lightGray })

export const THEMES: Theme[] = [
  theme('cargo', 'TAYKO CARGO', { gold: '#f4c430', goldLight: '#ffd700', goldDark: '#c9a22b', orange: '#ff8c00', orangeLight: '#ffa500', accent: '#ff6b00', black: '#0a0a0f', panel: '#0f0f1a' }),
  theme('miner', 'TAYKO MINER', { gold: '#ff6a3d', goldLight: '#ff9166', goldDark: '#c2401f', orange: '#ffb03a', orangeLight: '#ffc766', accent: '#ff3b1f', black: '#0f0908', panel: '#1a0f0d' }),
  theme('salvage', 'TAYKO SALVAGE', { gold: '#22c7ff', goldLight: '#7ee3ff', goldDark: '#1592b8', orange: '#4f7bff', orangeLight: '#7d9dff', accent: '#2f5bff', black: '#070a12', panel: '#0c1220' }, gray('#141b26', '#22304a', '#2f4060')),
  theme('slime', 'SLIME', { gold: '#9cff2e', goldLight: '#c4ff6b', goldDark: '#6fbf1c', orange: '#e1ff3c', orangeLight: '#f0ff85', accent: '#5fe000', black: '#080d06', panel: '#0e160c' }, gray('#141c11', '#22301c', '#304226')),
  theme('pinky', 'PINKY WINKY', { gold: '#ff5fb7', goldLight: '#ff94d0', goldDark: '#c43d88', orange: '#d65bff', orangeLight: '#e48bff', accent: '#ff3d9a', black: '#140a12', panel: '#1f1020' }, gray('#24141f', '#3a2033', '#4d2b44')),
  // Preto, cinza-chumbo e vermelho-sangue: o visual "fora da lei" das naves Drake.
  theme('drake', 'DRAKE', { gold: '#c8161e', goldLight: '#e5484d', goldDark: '#86100f', orange: '#6e747b', orangeLight: '#9aa1a8', accent: '#e02428', black: '#040404', panel: '#0e0e0f' }, gray('#141415', '#262628', '#36363a')),
  theme('rsi', 'RSI', { gold: '#4aa8ff', goldLight: '#8cc9ff', goldDark: '#2d6fb0', orange: '#dce8f5', orangeLight: '#ffffff', accent: '#6fb8ff', black: '#071125', panel: '#0d1b36' }, gray('#13213d', '#22355a', '#2f4772')),
  // Cinza-chumbo industrial.
  theme('argo', 'ARGO', { gold: '#ff8a1c', goldLight: '#ffab5c', goldDark: '#c4650f', orange: '#ffd23f', orangeLight: '#ffe27a', accent: '#ff6a00', black: '#1c1d20', panel: '#25272b' }, gray('#2c2e33', '#3c3f45', '#4c5058')),
  // Aço cinza-azulado.
  theme('aegis', 'AEGIS', { gold: '#d0353f', goldLight: '#e0606a', goldDark: '#8f1f27', orange: '#a9b4bf', orangeLight: '#cfd8e0', accent: '#e04848', black: '#191c21', panel: '#22262c' }, gray('#292e35', '#383e47', '#48505b')),
  // Cinza-oliva militar.
  theme('anvil', 'ANVIL', { gold: '#a8b45a', goldLight: '#c8d27e', goldDark: '#6f7a33', orange: '#d8c08a', orangeLight: '#eadbb0', accent: '#b9a35c', black: '#1b1d16', panel: '#24271d' }, gray('#2b2e23', '#3a3e2f', '#4a4f3c')),
  // Modo claro: fundo gelo, painéis brancos, texto grafite e detalhes em bronze-champanhe.
  theme(
    'origin',
    'ORIGIN',
    { gold: '#8a6a2e', goldLight: '#a8854a', goldDark: '#6b4f1e', orange: '#6b7785', orangeLight: '#8a96a3', accent: '#9c7a3c', black: '#eef1f4', panel: '#ffffff' },
    gray('#f7f9fb', '#d5dbe2', '#c2cad3'),
    { text: '#1d2430', muted: '#5a6370', steel: '#4f5966', profit: '#11834a', danger: '#c62828', warn: '#b35c00', warnLight: '#c46700', info: '#1f6fbf' },
  ),
  theme('crusader', 'CRUSADER', { gold: '#7cc4ff', goldLight: '#b0dcff', goldDark: '#4a8cc4', orange: '#f2f7ff', orangeLight: '#ffffff', accent: '#5aaef5', black: '#151e2b', panel: '#1c2736' }, gray('#223042', '#2f4057', '#3d516c')),
  theme('misc', 'MISC', { gold: '#2ec4b6', goldLight: '#6fe0d5', goldDark: '#1f8a80', orange: '#f0f4f2', orangeLight: '#ffffff', accent: '#23a89c', black: '#060d0d', panel: '#0c1716' }, gray('#121f1e', '#1f3331', '#2b4542')),
  theme('ninetails', 'NINE TAILS', { gold: '#b44dff', goldLight: '#d08cff', goldDark: '#7a2fb3', orange: '#ff3dd4', orangeLight: '#ff7ae3', accent: '#9b3dff', black: '#0b0710', panel: '#150d1d' }, gray('#1b1225', '#2c1e3c', '#3c2952')),
]

export const DEFAULT_THEME: ThemeId = 'cargo'

export const isThemeId = (v: unknown): v is ThemeId => THEMES.some((t) => t.id === v)

/** Cores com significado no tema escuro: o tema claro sobrescreve, e ao voltar para um escuro elas são restauradas. */
const DARK_SEMANTIC: Record<string, string> = {
  '--profit': '#3ddc84',
  '--danger': '#ff4d4d',
  '--warn': '#ff8c00',
  '--warn-light': '#ffa500',
  '--warn-rgb': '255, 140, 0',
  '--info': '#5fb4ff',
}

/** Grava as variáveis do tema no :root. Id desconhecido usa o padrão. */
export function applyTheme(id: ThemeId) {
  const t = THEMES.find((x) => x.id === id) ?? THEMES[0]
  const style = document.documentElement.style
  for (const [k, v] of Object.entries({ ...DARK_SEMANTIC, ...t.vars })) style.setProperty(k, v)
  document.documentElement.dataset.theme = t.id
}

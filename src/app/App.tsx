import { useState, type ReactNode } from 'react'
import logoMark from '../assets/logo-mark.png'
import { useUex } from '../data/useUex'
import { formatAge } from '../domain/freshness'
import { useI18n, type Lang } from '../i18n/i18n'
import { Tabs, type TabItem } from '../ui/components'
import { ErrorBoundary } from '../ui/ErrorBoundary'

export type MainTab = 'home' | 'trade' | 'ships' | 'progress' | 'mining' | 'salvage' | 'fleet' | 'settings'
export type TradeTab = 'commodities' | 'locations' | 'harvestables' | 'finder' | 'routes' | 'currencies'
export type MiningTab = 'ores' | 'refineries' | 'planner' | 'equipment' | 'ground'

export interface Nav {
  main: MainTab
  trade: TradeTab
  mining: MiningTab
}

/** Telas registradas pelas tarefas seguintes. Sem registro, mostra um espaço vazio. */
export interface Screens {
  home?: (go: (nav: Partial<Nav>) => void) => ReactNode
  ships?: () => ReactNode
  progress?: () => ReactNode
  settings?: () => ReactNode
  trade?: Partial<Record<TradeTab, () => ReactNode>>
  mining?: Partial<Record<MiningTab, () => ReactNode>>
}

function Header() {
  const { t, lang, setLang } = useI18n()
  return (
    <header className="header">
      <img src={logoMark} alt="Tayko Corp" />
      <div>
        <h1>{t('app.title')}</h1>
        <div className="subtitle">{t('app.subtitle')}</div>
      </div>
      <div className="spacer" />
      <div className="lang-toggle" role="group" aria-label="Idioma / Language">
        {(['pt', 'en'] as Lang[]).map((l) => (
          <button key={l} aria-pressed={lang === l} onClick={() => setLang(l)}>
            {l === 'pt' ? 'PT-BR' : 'EN'}
          </button>
        ))}
      </div>
    </header>
  )
}

function Footer() {
  const { t, lang } = useI18n()
  const prices = useUex('commodities_prices_all')
  return (
    <footer className="footer">
      <span>
        <strong>{t('footer.data')}</strong>
        {prices.fetchedAt && <> · {t('footer.updated', { age: formatAge(prices.fetchedAt / 1000, Date.now(), lang) })}</>}
      </span>
      <span>{t('footer.disclaimer')}</span>
    </footer>
  )
}

const MAIN: MainTab[] = ['home', 'trade', 'ships', 'progress', 'mining', 'salvage', 'fleet', 'settings']
const TRADE: TradeTab[] = ['commodities', 'locations', 'harvestables', 'finder', 'routes', 'currencies']
const MINING: MiningTab[] = ['ores', 'refineries', 'planner', 'equipment', 'ground']

/** Lê a aba inicial do endereço, ex.: `#trade/finder`. */
function navFromHash(): Nav {
  const [main, sub] = window.location.hash.replace(/^#/, '').split('/')
  return {
    main: MAIN.includes(main as MainTab) ? (main as MainTab) : 'home',
    trade: TRADE.includes(sub as TradeTab) ? (sub as TradeTab) : 'commodities',
    mining: MINING.includes(sub as MiningTab) ? (sub as MiningTab) : 'ores',
  }
}

export default function App({ screens = {} }: { screens?: Screens }) {
  const { t } = useI18n()
  const [nav, setNav] = useState<Nav>(navFromHash)
  const go = (patch: Partial<Nav>) => setNav((n) => ({ ...n, ...patch }))

  const mainTabs: TabItem<MainTab>[] = [
    { key: 'home', label: t('tab.home') },
    { key: 'trade', label: t('tab.trade') },
    { key: 'ships', label: t('tab.ships') },
    { key: 'progress', label: t('tab.progress') },
    { key: 'mining', label: t('tab.mining') },
    { key: 'salvage', label: t('tab.salvage'), disabled: true, hint: t('tab.soon', { phase: 3 }) },
    { key: 'fleet', label: t('tab.fleet'), disabled: true, hint: t('tab.soon', { phase: 3 }) },
    { key: 'settings', label: t('tab.settings') },
  ]

  const tradeTabs: TabItem<TradeTab>[] = [
    { key: 'commodities', label: 'Commodities' },
    { key: 'locations', label: 'Locations' },
    { key: 'harvestables', label: 'Harvestables' },
    { key: 'finder', label: 'Price Finder' },
    { key: 'routes', label: 'Routes' },
    { key: 'currencies', label: 'Currencies Index' },
  ]

  const miningTabs: TabItem<MiningTab>[] = [
    { key: 'ores', label: 'Ores' },
    { key: 'refineries', label: 'Refineries' },
    { key: 'planner', label: 'Refine Planner' },
    { key: 'equipment', label: 'Equipment' },
    { key: 'ground', label: 'Ground Mining' },
  ]

  let content: ReactNode = null
  if (nav.main === 'home') content = screens.home?.(go)
  else if (nav.main === 'ships') content = screens.ships?.()
  else if (nav.main === 'progress') content = screens.progress?.()
  else if (nav.main === 'settings') content = screens.settings?.()
  else if (nav.main === 'mining')
    content = (
      <>
        <Tabs items={miningTabs} active={nav.mining} onChange={(k) => go({ mining: k })} sub />
        {screens.mining?.[nav.mining]?.()}
      </>
    )
  else if (nav.main === 'trade')
    content = (
      <>
        <Tabs items={tradeTabs} active={nav.trade} onChange={(k) => go({ trade: k })} sub />
        {screens.trade?.[nav.trade]?.()}
      </>
    )

  return (
    <div className="app">
      <Header />
      <Tabs items={mainTabs} active={nav.main} onChange={(k) => go({ main: k })} />
      <main className="main">
        <ErrorBoundary key={`${nav.main}/${nav.trade}/${nav.mining}`}>{content}</ErrorBoundary>
      </main>
      <Footer />
    </div>
  )
}

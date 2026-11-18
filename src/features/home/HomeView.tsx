import logo from '../../assets/logo.png'
import type { Commodity, PriceRow, Terminal, Vehicle } from '../../data/types'
import { formatAge } from '../../domain/freshness'
import { useI18n } from '../../i18n/i18n'
import type { Prefs } from '../../store/prefs'
import { DataTable, Panel, SectionLabel } from '../../ui/components'
import { RouteCard } from '../trade/RouteCard'
import { RouteControls } from '../trade/RouteControls'
import { useRouteResult } from '../trade/useRouteResult'

export interface CacheInfo {
  resource: string
  fetchedAt: number | null
}

export function HomeView({
  vehicles,
  commodities,
  prices,
  terminals,
  now,
  prefs,
  onPrefs,
  balance = null,
  cache,
  refreshing = false,
  onSetup,
  onRefreshAll,
}: {
  vehicles: Vehicle[]
  commodities: Commodity[]
  prices: PriceRow[]
  terminals: Terminal[]
  now: number
  prefs: Prefs
  onPrefs: (patch: Partial<Prefs>) => void
  balance?: number | null
  cache: CacheInfo[]
  refreshing?: boolean
  onSetup: () => void
  onRefreshAll: () => void
}) {
  const { t, lang } = useI18n()
  const { result, message, ship } = useRouteResult(vehicles, commodities, prices, terminals, prefs, t, 5)

  return (
    <div className="home">
      <div className="home-hero">
        <img src={logo} alt="Tayko Corp" />
        <div>
          <SectionLabel>{t('home.overview')}</SectionLabel>
          <h2 className="hero-title">{t('app.title')}</h2>
          <p className="muted">{t('app.subtitle')}</p>
        </div>
      </div>

      <div className="grid-2 home-grid">
        <Panel>
          <SectionLabel>
            {t('home.topRoutes')}
            {ship && ` · ${ship.name_full}`}
          </SectionLabel>
          <div className="home-controls">
            <RouteControls vehicles={vehicles} terminals={terminals} prefs={prefs} onPrefs={onPrefs} balance={balance} compact />
          </div>
          {result?.ok && result.routes.length > 0 ? (
            <div className="stack">
              {result.routes.map((r) => (
                <RouteCard key={`${r.buy.id}-${r.sell.id}`} route={r} now={now} warnHours={prefs.warnHours} staleDays={prefs.staleDays} />
              ))}
            </div>
          ) : (
            <div className="stack" style={{ alignItems: 'flex-start' }}>
              <p className="muted">{message}</p>
              <button className="btn primary" onClick={onSetup}>
                {t('home.setup')}
              </button>
            </div>
          )}
        </Panel>

        <Panel>
          <SectionLabel>{t('home.cache')}</SectionLabel>
          <DataTable
            rows={cache}
            rowKey={(c) => c.resource}
            columns={[
              { key: 'r', header: 'UEX', render: (c) => <code>{c.resource}</code> },
              {
                key: 'age',
                header: t('common.updated'),
                render: (c) => (c.fetchedAt ? formatAge(c.fetchedAt / 1000, now, lang) : <span className="muted">{t('home.never')}</span>),
              },
            ]}
          />
          <div style={{ marginTop: 14 }}>
            <button className="btn" onClick={onRefreshAll} disabled={refreshing}>
              {t('home.refreshAll')}
            </button>
          </div>
        </Panel>
      </div>
    </div>
  )
}

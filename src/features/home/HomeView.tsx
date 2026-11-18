import { useMemo } from 'react'
import logo from '../../assets/logo.png'
import type { Commodity, PriceRow, Terminal, Vehicle } from '../../data/types'
import { formatAge } from '../../domain/freshness'
import { computeRoutes } from '../../domain/routes'
import { useI18n } from '../../i18n/i18n'
import type { Prefs } from '../../store/prefs'
import { DataTable, Panel, SectionLabel } from '../../ui/components'
import { RouteCard } from '../trade/RouteCard'

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
  cache,
  onSetup,
  onRefreshAll,
}: {
  vehicles: Vehicle[]
  commodities: Commodity[]
  prices: PriceRow[]
  terminals: Terminal[]
  now: number
  prefs: Prefs
  cache: CacheInfo[]
  onSetup: () => void
  onRefreshAll: () => void
}) {
  const { t, lang } = useI18n()
  const ship = vehicles.find((v) => v.id === prefs.shipId) ?? null
  const terminalMap = useMemo(() => new Map(terminals.map((x) => [x.id, x])), [terminals])
  const result = useMemo(
    () =>
      ship
        ? computeRoutes(
            prices,
            commodities,
            terminalMap,
            { shipScu: ship.scu, budget: prefs.budget, excludeIllegal: prefs.excludeIllegal, originSystem: prefs.originSystem || undefined, sortBy: prefs.sortBy },
            5,
          )
        : null,
    [ship, prices, commodities, terminalMap, prefs],
  )

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
          {result?.ok && result.routes.length > 0 ? (
            <div className="stack">
              {result.routes.map((r) => (
                <RouteCard key={`${r.buy.id}-${r.sell.id}`} route={r} now={now} warnHours={prefs.warnHours} staleDays={prefs.staleDays} />
              ))}
            </div>
          ) : (
            <div className="stack" style={{ alignItems: 'flex-start' }}>
              <p className="muted">{!ship ? t('routes.needShip') : result && !result.ok ? t('routes.needBudget') : t('routes.none')}</p>
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
            <button className="btn" onClick={onRefreshAll}>
              {t('home.refreshAll')}
            </button>
          </div>
        </Panel>
      </div>
    </div>
  )
}

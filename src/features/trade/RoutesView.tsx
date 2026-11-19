import { useMemo, useState } from 'react'
import type { Commodity, PriceRow, Terminal, Vehicle } from '../../data/types'
import { activeMarks, routeKey, toggleMark, type MarkKind } from '../../domain/routeMarks'
import { useI18n } from '../../i18n/i18n'
import type { Prefs } from '../../store/prefs'
import { useRouteMarks } from '../../store/routeMarks'
import { Panel, SectionLabel } from '../../ui/components'
import { RouteCard } from './RouteCard'
import { RouteControls } from './RouteControls'
import { useRouteResult } from './useRouteResult'

export function RoutesView({
  vehicles,
  commodities,
  prices,
  terminals,
  now,
  prefs,
  onPrefs,
  balance = null,
}: {
  vehicles: Vehicle[]
  commodities: Commodity[]
  prices: PriceRow[]
  terminals: Terminal[]
  now: number
  prefs: Prefs
  onPrefs: (patch: Partial<Prefs>) => void
  balance?: number | null
}) {
  const { t } = useI18n()
  const [marks, setMark] = useRouteMarks()
  const [showHidden, setShowHidden] = useState(false)
  const hiddenKeys = useMemo(() => new Set(Object.keys(marks).filter((k) => marks[k].marks.includes('hidden'))), [marks])
  const { result, message } = useRouteResult(vehicles, commodities, prices, terminals, prefs, t, 50, showHidden ? { onlyKeys: hiddenKeys } : { hiddenKeys })

  const routes = result?.ok ? result.routes : []
  const shownKeys = new Set(routes.map(routeKey))
  // Ocultas que o cálculo atual não devolve (preço mudou, nave, filtro…): lista simples para poder desfazer.
  const orphans = showHidden ? [...hiddenKeys].filter((k) => !shownKeys.has(k)) : []

  const unhide = (key: string) => {
    const rec = marks[key]
    const rest = rec.marks.filter((m) => m !== 'hidden')
    setMark(key, rest.length ? { ...rec, marks: rest } : undefined)
  }

  return (
    <div className="stack">
      <Panel glow>
        <SectionLabel>{t('routes.title')}</SectionLabel>
        <RouteControls vehicles={vehicles} terminals={terminals} prefs={prefs} onPrefs={onPrefs} balance={balance} />
        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn" onClick={() => setShowHidden(!showHidden)}>
            {showHidden ? t('marks.back') : t('marks.showHidden', { n: hiddenKeys.size })}
          </button>
        </div>
      </Panel>

      {showHidden && hiddenKeys.size === 0 && <p className="muted">{t('marks.noneHidden')}</p>}

      {message ? (
        <p className="muted">{message}</p>
      ) : (
        <div className="route-grid">
          {routes.map((r) => {
            const key = routeKey(r)
            return (
              <RouteCard
                key={`${r.buy.id}-${r.sell.id}`}
                route={r}
                now={now}
                warnHours={prefs.warnHours}
                staleDays={prefs.staleDays}
                marks={activeMarks(marks[key], r.buy.date_modified, r.sell.date_modified)}
                onToggleMark={(kind: MarkKind) => setMark(key, toggleMark(marks[key], kind, r))}
              />
            )
          })}
        </div>
      )}

      {orphans.length > 0 && (
        <Panel>
          <SectionLabel>{t('marks.orphans')}</SectionLabel>
          <ul className="orphan-list">
            {orphans.map((k) => {
              const rec = marks[k]
              return (
                <li key={k} aria-label={rec.commodityName}>
                  <b>{rec.commodityName}</b>{' '}
                  <span className="muted">
                    {rec.buyName} → {rec.sellName}
                  </span>{' '}
                  <button className="btn-link" onClick={() => unhide(k)}>
                    {t('marks.unhide')}
                  </button>
                </li>
              )
            })}
          </ul>
        </Panel>
      )}
    </div>
  )
}

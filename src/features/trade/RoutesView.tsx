import type { Commodity, PriceRow, Terminal, Vehicle } from '../../data/types'
import { useI18n } from '../../i18n/i18n'
import type { Prefs } from '../../store/prefs'
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
  const { result, message } = useRouteResult(vehicles, commodities, prices, terminals, prefs, t)

  return (
    <div className="stack">
      <Panel glow>
        <SectionLabel>{t('routes.title')}</SectionLabel>
        <RouteControls vehicles={vehicles} terminals={terminals} prefs={prefs} onPrefs={onPrefs} balance={balance} />
      </Panel>

      {message ? (
        <p className="muted">{message}</p>
      ) : (
        result?.ok && (
          <div className="route-grid">
            {result.routes.map((r) => (
              <RouteCard key={`${r.buy.id}-${r.sell.id}`} route={r} now={now} warnHours={prefs.warnHours} staleDays={prefs.staleDays} />
            ))}
          </div>
        )
      )}
    </div>
  )
}

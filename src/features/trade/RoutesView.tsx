import { useEffect, useMemo, useState } from 'react'
import type { Commodity, PriceRow, Terminal, Vehicle } from '../../data/types'
import { formatAuec, parseAmount } from '../../domain/format'
import { computeRoutes } from '../../domain/routes'
import { useI18n } from '../../i18n/i18n'
import type { Prefs } from '../../store/prefs'
import { Panel, SectionLabel } from '../../ui/components'
import { RouteCard } from './RouteCard'

export function RoutesView({
  vehicles,
  commodities,
  prices,
  terminals,
  now,
  prefs,
  onPrefs,
}: {
  vehicles: Vehicle[]
  commodities: Commodity[]
  prices: PriceRow[]
  terminals: Terminal[]
  now: number
  prefs: Prefs
  onPrefs: (patch: Partial<Prefs>) => void
}) {
  const { t } = useI18n()
  const [budgetText, setBudgetText] = useState(prefs.budget > 0 ? formatAuec(prefs.budget) : '')
  useEffect(() => {
    // Só reescreve o campo quando o orçamento mudou por fora (ex.: AJUSTES); texto inválido digitado fica como está.
    const typed = parseAmount(budgetText)
    const typedBudget = Number.isFinite(typed) ? typed : 0
    if (typedBudget !== prefs.budget) setBudgetText(prefs.budget > 0 ? formatAuec(prefs.budget) : '')
    // só reage a mudanças externas do orçamento
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs.budget])

  const cargoShips = useMemo(
    () => vehicles.filter((v) => v.scu > 0).sort((a, b) => a.name_full.localeCompare(b.name_full)),
    [vehicles],
  )
  const ship = vehicles.find((v) => v.id === prefs.shipId) ?? null
  const terminalMap = useMemo(() => new Map(terminals.map((x) => [x.id, x])), [terminals])
  const systems = useMemo(
    () => [...new Set(terminals.map((x) => x.star_system_name).filter((s): s is string => !!s))].sort(),
    [terminals],
  )

  const result = useMemo(() => {
    if (!ship) return null
    return computeRoutes(prices, commodities, terminalMap, {
      shipScu: ship.scu,
      budget: prefs.budget,
      excludeIllegal: prefs.excludeIllegal,
      originSystem: prefs.originSystem || undefined,
      sortBy: prefs.sortBy,
    })
  }, [ship, prices, commodities, terminalMap, prefs.budget, prefs.excludeIllegal, prefs.originSystem, prefs.sortBy])

  let message: string | null = null
  if (!ship) message = t('routes.needShip')
  else if (result && !result.ok) message = result.reason === 'nave_sem_carga' ? t('routes.noCargo') : t('routes.needBudget')
  else if (result?.ok && result.routes.length === 0) message = t('routes.none')

  return (
    <div className="stack">
      <Panel glow>
        <SectionLabel>{t('routes.title')}</SectionLabel>
        <div className="row">
          <label className="field">
            {t('routes.ship')}
            <select
              className="select"
              value={prefs.shipId ?? ''}
              onChange={(e) => onPrefs({ shipId: e.target.value ? Number(e.target.value) : null })}
            >
              <option value="" disabled hidden>
                {t('routes.pickShip')}
              </option>
              {ship && ship.scu <= 0 && <option value={ship.id}>{ship.name_full}</option>}
              {cargoShips.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name_full} · {v.scu} SCU
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            {t('routes.budget')}
            <input
              className="input num"
              inputMode="numeric"
              value={budgetText}
              placeholder="0"
              onChange={(e) => {
                setBudgetText(e.target.value)
                const n = parseAmount(e.target.value)
                onPrefs({ budget: Number.isFinite(n) ? n : 0 })
              }}
            />
          </label>
          <label className="field">
            {t('routes.originSystem')}
            <select className="select" value={prefs.originSystem} onChange={(e) => onPrefs({ originSystem: e.target.value })}>
              <option value="">{t('routes.anySystem')}</option>
              {systems.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            {t('routes.sortBy')}
            <select className="select" value={prefs.sortBy} onChange={(e) => onPrefs({ sortBy: e.target.value as Prefs['sortBy'] })}>
              <option value="profit">{t('routes.sortProfit')}</option>
              <option value="roi">{t('routes.sortRoi')}</option>
            </select>
          </label>
          <label className="check">
            <input type="checkbox" checked={prefs.excludeIllegal} onChange={(e) => onPrefs({ excludeIllegal: e.target.checked })} />
            {t('routes.excludeIllegal')}
          </label>
        </div>
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

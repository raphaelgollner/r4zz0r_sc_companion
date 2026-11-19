import { useCallback, useMemo, useState } from 'react'
import type { Commodity, PriceRow, Terminal, Vehicle } from '../../data/types'
import { formatAuec } from '../../domain/format'
import { bestPaths, greedyPaths, rankByDistance, rankRoundabouts, roundabouts, type DistanceOf, type TradePath } from '../../domain/path'
import { activeMarks, routeKey, toggleMark, type MarkKind } from '../../domain/routeMarks'
import type { RouteOption } from '../../domain/routes'
import { useI18n } from '../../i18n/i18n'
import type { Prefs } from '../../store/prefs'
import { useRouteMarks } from '../../store/routeMarks'
import { Panel, SectionLabel } from '../../ui/components'
import { DistanceFetcher } from '../mining/DistanceFetcher'
import { RouteCard } from './RouteCard'
import { RouteControls } from './RouteControls'
import { useRouteResult } from './useRouteResult'

/** Rotas mais lucrativas que têm a distância buscada no modo REDUZIR DISTÂNCIAS. */
const DISTANCE_TOP = 30
/** Pares do ROTATIVO que têm a distância buscada. */
const ROUNDABOUT_TOP = 15

/** Busca a distância de um par e devolve com a chave "origem:destino". */
function PairDistance({ from, to, onPair }: { from: number; to: number; onPair: (key: string, d: number | null) => void }) {
  const onDistance = useCallback((dest: number, d: number | null) => onPair(`${from}:${dest}`, d), [from, onPair])
  return <DistanceFetcher origin={from} destination={to} onDistance={onDistance} />
}

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
  const [distances, setDistances] = useState<Map<string, number | null>>(new Map())
  const hiddenKeys = useMemo(() => new Set(Object.keys(marks).filter((k) => marks[k].marks.includes('hidden'))), [marks])
  const { result, message, ship, input, terminalMap } = useRouteResult(
    vehicles,
    commodities,
    prices,
    terminals,
    prefs,
    t,
    50,
    showHidden ? { onlyKeys: hiddenKeys } : { hiddenKeys },
  )
  const mode = showHidden ? 'list' : prefs.routeMode
  const short = prefs.shortDistances

  const onPair = useCallback(
    (key: string, d: number | null) =>
      setDistances((prev) => {
        if (prev.has(key) && prev.get(key) === d) return prev
        return new Map(prev).set(key, d)
      }),
    [],
  )
  const distanceOf: DistanceOf = useCallback((a, b) => (distances.has(`${a}:${b}`) ? distances.get(`${a}:${b}`) : undefined), [distances])

  const routes = result?.ok ? result.routes : []

  // Lista solta: com REDUZIR DISTÂNCIAS, as 30 mais lucrativas sobem por lucro por Gm.
  const listView = useMemo(() => {
    if (mode !== 'list' || !short) return { routes, pending: [] as [number, number][] }
    const top = routes.slice(0, DISTANCE_TOP)
    const pending = top.filter((r) => distanceOf(r.buy.id_terminal, r.sell.id_terminal) === undefined).map((r) => [r.buy.id_terminal, r.sell.id_terminal] as [number, number])
    return { routes: [...rankByDistance(top, distanceOf), ...routes.slice(DISTANCE_TOP)], pending }
  }, [mode, short, routes, distanceOf])

  const pathView = useMemo(() => {
    if (mode !== 'path' || !ship) return { paths: [] as TradePath[], pending: [] as [number, number][] }
    const opts = { legs: prefs.pathLegs, start: prefs.pathStart }
    const beam = bestPaths(prices, commodities, terminalMap, input, opts)
    if (!short) return { paths: beam, pending: [] }
    const g = greedyPaths(prices, commodities, terminalMap, input, opts, distanceOf)
    // Enquanto as distâncias não chegam, mostra os caminhos pelo lucro.
    return g.pending.length ? { paths: beam, pending: g.pending } : g
  }, [mode, ship, prices, commodities, terminalMap, input, prefs.pathLegs, prefs.pathStart, short, distanceOf])

  const roundaboutView = useMemo(() => {
    if (mode !== 'roundabout' || !ship) return { paths: [] as TradePath[], pending: [] as [number, number][] }
    if (!short) return { paths: roundabouts(prices, commodities, terminalMap, input, { start: prefs.pathStart }), pending: [] }
    const all = roundabouts(prices, commodities, terminalMap, input, { start: prefs.pathStart, count: ROUNDABOUT_TOP })
    const pending = all
      .map((p) => [p.legs[0].buy.id_terminal, p.legs[0].sell.id_terminal] as [number, number])
      .filter(([a, b]) => distanceOf(a, b) === undefined)
    return { paths: pending.length ? all.slice(0, 3) : rankRoundabouts(all, distanceOf).slice(0, 3), pending }
  }, [mode, ship, prices, commodities, terminalMap, input, prefs.pathStart, short, distanceOf])

  const pending = mode === 'list' ? listView.pending : mode === 'path' ? pathView.pending : roundaboutView.pending
  const groups = mode === 'path' ? pathView.paths : roundaboutView.paths
  const orphans = showHidden ? [...hiddenKeys].filter((k) => !routes.some((r) => routeKey(r) === k)) : []

  const unhide = (key: string) => {
    const rec = marks[key]
    const rest = rec.marks.filter((m) => m !== 'hidden')
    setMark(key, rest.length ? { ...rec, marks: rest } : undefined)
  }

  const card = (r: RouteOption, extra: { legLabel?: string } = {}) => {
    const key = routeKey(r)
    const d = short ? distanceOf(r.buy.id_terminal, r.sell.id_terminal) : undefined
    return (
      <RouteCard
        key={`${r.buy.id}-${r.sell.id}-${extra.legLabel ?? ''}`}
        route={r}
        now={now}
        warnHours={prefs.warnHours}
        staleDays={prefs.staleDays}
        marks={activeMarks(marks[key], r.buy.date_modified, r.sell.date_modified)}
        onToggleMark={(kind: MarkKind) => setMark(key, toggleMark(marks[key], kind, r))}
        legLabel={extra.legLabel}
        distance={d}
      />
    )
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
          {short && pending.length > 0 && <span className="muted">{t('path.loadingDistances', { n: pending.length })}</span>}
        </div>
      </Panel>

      {pending.map(([a, b]) => (
        <PairDistance key={`${a}:${b}`} from={a} to={b} onPair={onPair} />
      ))}

      {showHidden && hiddenKeys.size === 0 && <p className="muted">{t('marks.noneHidden')}</p>}

      {showHidden && hiddenKeys.size === 0 ? null : message ? (
        <p className="muted">{message}</p>
      ) : mode === 'list' ? (
        <div className="route-grid">{listView.routes.map((r) => card(r))}</div>
      ) : groups.length === 0 ? (
        <p className="muted">{t(mode === 'path' ? 'path.none' : 'path.noneRoundabout')}</p>
      ) : (
        groups.map((p, i) => {
          const title = t(mode === 'path' ? 'path.title' : 'path.roundaboutTitle', { n: i + 1 })
          return (
            <div key={i} role="region" aria-label={title} className="path-group">
              <SectionLabel>
                {title} · ≈ {formatAuec(p.total)} aUEC · {t('path.legsCount', { n: p.legs.length })}
              </SectionLabel>
              {p.short && <p className="warn-text">{t('path.short_warn', { n: p.legs.length, want: prefs.pathLegs })}</p>}
              {p.capped && <p className="warn-text">{t('path.capped')}</p>}
              <div className="route-grid">{p.legs.map((r, j) => card(r, { legLabel: t('path.legOf', { i: j + 1, n: p.legs.length }) }))}</div>
            </div>
          )
        })
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

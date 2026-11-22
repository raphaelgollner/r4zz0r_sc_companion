import { useCallback, useMemo, useState } from 'react'
import type { Commodity, PriceRow, Terminal, Vehicle } from '../../data/types'
import { formatAuec } from '../../domain/format'
import { bestPaths, greedyPaths, rankByDistance, rankRoundabouts, roundabouts, type DistanceOf } from '../../domain/path'
import { activeMarks, routeKey, toggleMark, type MarkKind } from '../../domain/routeMarks'
import { hasLoadingDock, needsLoadingDock, routeFilters, type RouteOption } from '../../domain/routes'
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

  const routes = useMemo(() => (result?.ok ? result.routes : []), [result])
  // "Começar em" que sumiu da lista de terminais é ignorado; evitado (Evitar/Risco) é explicado.
  const dockIds = useMemo(
    () => (needsLoadingDock(ship) ? new Set(terminals.filter(hasLoadingDock).map((x) => x.id)) : undefined),
    [ship, terminals],
  )
  const startId = prefs.pathStart !== null && terminalMap.has(prefs.pathStart) ? prefs.pathStart : null
  const startAvoided = useMemo(
    () => startId !== null && routeFilters(commodities, terminalMap, input).avoided(startId),
    [startId, commodities, terminalMap, input],
  )

  // Lista solta: com REDUZIR DISTÂNCIAS, as 30 mais lucrativas sobem por lucro por Gm.
  const listView = useMemo(() => {
    if (mode !== 'list' || !short) return { routes, pending: [] as [number, number][] }
    // As 30 mais lucrativas (a lista pode estar por ROI).
    const top = [...routes].sort((a, b) => b.profit - a.profit).slice(0, DISTANCE_TOP)
    const topKeys = new Set(top.map(routeKey))
    const pending = new Map<string, [number, number]>()
    for (const r of top)
      if (distanceOf(r.buy.id_terminal, r.sell.id_terminal) === undefined) pending.set(`${r.buy.id_terminal}:${r.sell.id_terminal}`, [r.buy.id_terminal, r.sell.id_terminal])
    return { routes: [...rankByDistance(top, distanceOf), ...routes.filter((r) => !topKeys.has(routeKey(r)))], pending: [...pending.values()] }
  }, [mode, short, routes, distanceOf])

  // Cálculos pesados ficam fora das distâncias: cada distância que chega só refaz a escolha gulosa/ordenação.
  const beamPaths = useMemo(
    () => (mode === 'path' && ship ? bestPaths(prices, commodities, terminalMap, input, { legs: prefs.pathLegs, start: startId }) : []),
    [mode, ship, prices, commodities, terminalMap, input, prefs.pathLegs, startId],
  )
  const pathView = useMemo(() => {
    if (mode !== 'path' || !ship || !short) return { paths: beamPaths, pending: [] as [number, number][] }
    const g = greedyPaths(prices, commodities, terminalMap, input, { legs: prefs.pathLegs, start: startId }, distanceOf)
    // Enquanto as distâncias não chegam, mostra os caminhos pelo lucro.
    return g.pending.length ? { paths: beamPaths, pending: g.pending } : g
  }, [mode, ship, short, beamPaths, prices, commodities, terminalMap, input, prefs.pathLegs, startId, distanceOf])

  const allRoundabouts = useMemo(
    () => (mode === 'roundabout' && ship ? roundabouts(prices, commodities, terminalMap, input, { start: startId, count: short ? ROUNDABOUT_TOP : 3 }) : []),
    [mode, ship, prices, commodities, terminalMap, input, startId, short],
  )
  const roundaboutView = useMemo(() => {
    if (!short) return { paths: allRoundabouts, pending: [] as [number, number][] }
    const pending = allRoundabouts
      .map((p) => [p.legs[0].buy.id_terminal, p.legs[0].sell.id_terminal] as [number, number])
      .filter(([a, b]) => distanceOf(a, b) === undefined)
    return { paths: pending.length ? allRoundabouts.slice(0, 3) : rankRoundabouts(allRoundabouts, distanceOf).slice(0, 3), pending }
  }, [short, allRoundabouts, distanceOf])

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
        dockIds={dockIds}
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
          <span className="muted" aria-live="polite">
            {short && pending.length > 0 ? t('path.loadingDistances', { n: pending.length }) : ''}
          </span>
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
        <p className="muted">{t(startAvoided ? 'path.startAvoided' : mode === 'path' ? 'path.none' : 'path.noneRoundabout')}</p>
      ) : (
        groups.map((p, i) => {
          const title = t(mode === 'path' ? 'path.title' : 'path.roundaboutTitle', { n: i + 1 })
          return (
            <div key={routeKey(p.legs[0])} role="region" aria-label={title} className="path-group">
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

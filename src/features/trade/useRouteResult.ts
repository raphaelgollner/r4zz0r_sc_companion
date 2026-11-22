import { useMemo } from 'react'
import type { Commodity, PriceRow, Terminal, Vehicle } from '../../data/types'
import { computeRoutes, needsLoadingDock, type RouteInput, type RouteResult } from '../../domain/routes'
import type { TFunction } from '../../i18n/i18n'
import { effectiveScu, type Prefs } from '../../store/prefs'

/** Rotas para as preferências atuais e a mensagem a mostrar quando não há rotas. */
export function useRouteResult(
  vehicles: Vehicle[],
  commodities: Commodity[],
  prices: PriceRow[],
  terminals: Terminal[],
  prefs: Prefs,
  t: TFunction,
  limit = 50,
  keys: { hiddenKeys?: ReadonlySet<string>; onlyKeys?: ReadonlySet<string> } = {},
): { result: RouteResult | null; message: string | null; ship: Vehicle | null; input: RouteInput; terminalMap: Map<number, Terminal> } {
  const ship = vehicles.find((v) => v.id === prefs.shipId) ?? null
  const terminalMap = useMemo(() => new Map(terminals.map((x) => [x.id, x])), [terminals])
  const scu = effectiveScu(prefs, ship)
  const { budget, excludeIllegal, originSystem, sortBy, avoid, maxRisk } = prefs
  const dockOnly = needsLoadingDock(ship) && prefs.dockFilter
  const input = useMemo<RouteInput>(
    () => ({ shipScu: scu, budget, excludeIllegal, originSystem: originSystem || undefined, sortBy, avoid, maxRisk, dockOnly, hiddenKeys: keys.hiddenKeys, onlyKeys: keys.onlyKeys }),
    [scu, budget, excludeIllegal, originSystem, sortBy, avoid, maxRisk, dockOnly, keys.hiddenKeys, keys.onlyKeys],
  )
  const result = useMemo(
    () => (ship ? computeRoutes(prices, commodities, terminalMap, input, limit) : null),
    [ship, prices, commodities, terminalMap, input, limit],
  )
  let message: string | null = null
  if (!ship) message = t('routes.needShip')
  else if (result && !result.ok) message = result.reason === 'nave_sem_carga' ? t('routes.noCargo') : t('routes.needBudget')
  else if (result?.ok && result.routes.length === 0) message = t('routes.none')
  return { result, message, ship, input, terminalMap }
}

import { useMemo } from 'react'
import type { Commodity, PriceRow, Terminal, Vehicle } from '../../data/types'
import { computeRoutes, type RouteResult } from '../../domain/routes'
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
): { result: RouteResult | null; message: string | null; ship: Vehicle | null } {
  const ship = vehicles.find((v) => v.id === prefs.shipId) ?? null
  const terminalMap = useMemo(() => new Map(terminals.map((x) => [x.id, x])), [terminals])
  const scu = effectiveScu(prefs, ship)
  const { budget, excludeIllegal, originSystem, sortBy } = prefs
  const result = useMemo(
    () =>
      ship
        ? computeRoutes(
            prices,
            commodities,
            terminalMap,
            { shipScu: scu, budget, excludeIllegal, originSystem: originSystem || undefined, sortBy },
            limit,
          )
        : null,
    [ship, scu, prices, commodities, terminalMap, budget, excludeIllegal, originSystem, sortBy, limit],
  )
  let message: string | null = null
  if (!ship) message = t('routes.needShip')
  else if (result && !result.ok) message = result.reason === 'nave_sem_carga' ? t('routes.noCargo') : t('routes.needBudget')
  else if (result?.ok && result.routes.length === 0) message = t('routes.none')
  return { result, message, ship }
}

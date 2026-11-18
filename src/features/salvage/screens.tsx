import { useCallback, useMemo, useState } from 'react'
import type { Commodity, CommodityStatus, PriceRow, Terminal, Vehicle } from '../../data/types'
import { useUex, type UexState } from '../../data/useUex'
import { distancesFor } from '../../domain/mining'
import { salvageMaterials, salvagePlan } from '../../domain/salvage'
import { useFleet } from '../../store/fleet'
import { effectiveScu, usePrefs } from '../../store/prefs'
import { useSalvagePrefs } from '../../store/salvagePrefs'
import { DistanceFetcher } from '../mining/DistanceFetcher'
import { HistoryPanel } from '../trade/HistoryPanel'
import { Loaded } from '../trade/screens'
import { MaterialsView } from './MaterialsView'
import { SalvagePlannerView } from './SalvagePlannerView'

const all = (...s: UexState<unknown>[]) => s
/** Distâncias buscadas só para os terminais mais valiosos (o RMC tem dezenas de compradores). */
const MAX_DISTANCES = 15

export function MaterialsScreen() {
  const commodities = useUex<Commodity[]>('commodities')
  const prices = useUex<PriceRow[]>('commodities_prices_all')
  const status = useUex<CommodityStatus>('commodities_status')
  return (
    <Loaded states={all(commodities, prices, status)}>
      {() => (
        <MaterialsView
          materials={salvageMaterials(commodities.data!)}
          prices={prices.data!}
          status={status.data!}
          now={Date.now()}
          renderHistory={(cid, row) => <HistoryPanel key={row.id} commodityId={cid} terminalId={row.id_terminal} terminalName={row.terminal_name} />}
        />
      )}
    </Loaded>
  )
}

export function SalvagePlannerScreen() {
  const commodities = useUex<Commodity[]>('commodities')
  const prices = useUex<PriceRow[]>('commodities_prices_all')
  const terminals = useUex<Terminal[]>('terminals')
  const vehicles = useUex<Vehicle[]>('vehicles')
  const [prefs, setPrefs] = useSalvagePrefs()
  const [routePrefs] = usePrefs()
  const { entries } = useFleet()
  const [distances, setDistances] = useState<Map<string, number | null>>(new Map())

  const materials = useMemo(() => salvageMaterials(commodities.data ?? []), [commodities.data])
  const ships = useMemo(() => (vehicles.data ?? []).filter((v) => v.is_salvage), [vehicles.data])
  const fleetIds = useMemo(() => new Set(entries.map((e) => e.vehicleId)), [entries])
  const tradeTerminals = useMemo(() => (terminals.data ?? []).filter((x) => x.type !== 'item' && x.type !== 'fuel'), [terminals.data])
  // Terminais candidatos: os mais valiosos para a carga atual (independe da distância).
  const candidates = useMemo(
    () => salvagePlan(prefs.cargo, prices.data ?? [], () => null, 'value').slice(0, MAX_DISTANCES).map((r) => r.terminalId),
    [prefs.cargo, prices.data],
  )
  const onDistance = useCallback(
    (destination: number, d: number | null) =>
      setDistances((prev) => {
        const k = `${prefs.locationId}:${destination}`
        if (prev.has(k) && prev.get(k) === d) return prev
        const next = new Map(prev)
        next.set(k, d)
        return next
      }),
    [prefs.locationId],
  )
  const distMap = useMemo(() => distancesFor(prefs.locationId, candidates, distances), [prefs.locationId, candidates, distances])

  return (
    <Loaded states={all(commodities, prices, terminals, vehicles)}>
      {() => (
        <>
          {prefs.locationId !== null &&
            candidates.map((id) =>
              id === prefs.locationId ? null : <DistanceFetcher key={`${prefs.locationId}:${id}`} origin={prefs.locationId!} destination={id} onDistance={onDistance} />,
            )}
          <SalvagePlannerView
            materials={materials}
            prices={prices.data!}
            ships={ships}
            fleetIds={fleetIds}
            scuOf={(v) => effectiveScu(routePrefs, v)}
            terminals={tradeTerminals}
            distances={distMap}
            prefs={prefs}
            onPrefs={setPrefs}
            now={Date.now()}
          />
        </>
      )}
    </Loaded>
  )
}

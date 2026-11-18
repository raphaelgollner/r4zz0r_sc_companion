import { useCallback, useMemo, useState } from 'react'
import { QUERY_TTL } from '../../data/ttl'
import type { Commodity, CommodityStatus, Item, ItemAttribute, ItemPrice, PriceRow, Terminal, Vehicle, VehiclePrice, VehicleRent } from '../../data/types'
import { useUex, useUexQuery, type UexState } from '../../data/useUex'
import { distancesFor } from '../../domain/mining'
import { salvageMaterials, salvagePlan } from '../../domain/salvage'
import { useFleet } from '../../store/fleet'
import { effectiveScu, usePrefs } from '../../store/prefs'
import { useSalvagePrefs } from '../../store/salvagePrefs'
import { DistanceFetcher } from '../mining/DistanceFetcher'
import { EquipmentView, type EquipmentKindDef } from '../mining/EquipmentView'
import { HistoryPanel } from '../trade/HistoryPanel'
import { Loaded } from '../trade/screens'
import { MaterialsView } from './MaterialsView'
import { SalvagePlannerView } from './SalvagePlannerView'
import { SalvageShipsView } from './SalvageShipsView'

const all = (...s: UexState<unknown>[]) => s

/** Categorias de equipamento de salvage no UEX (nomes como no UEX/jogo). */
export type SalvageKind = 'scraper' | 'tractor' | 'salvage'
export const SALVAGE_KINDS: EquipmentKindDef<SalvageKind>[] = [
  { key: 'scraper', label: 'Scraper Beams', category: 31 },
  { key: 'tractor', label: 'Tractor Beams', category: 67 },
  { key: 'salvage', label: 'Salvage Beams', category: 110 },
]
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

export function SalvageEquipmentScreen() {
  const [kind, setKind] = useState<SalvageKind>(SALVAGE_KINDS[0].key)
  const params = { id_category: SALVAGE_KINDS.find((k) => k.key === kind)!.category }
  const items = useUexQuery<Item[]>('items', params, QUERY_TTL.items)
  const attrs = useUexQuery<ItemAttribute[]>('items_attributes', params, QUERY_TTL.items_attributes)
  const prices = useUexQuery<ItemPrice[]>('items_prices', params, QUERY_TTL.items_prices)
  return (
    <Loaded states={all(items, attrs, prices)}>
      {() => <EquipmentView kinds={SALVAGE_KINDS} kind={kind} onKind={setKind} items={items.data!} attrs={attrs.data!} prices={prices.data!} now={Date.now()} />}
    </Loaded>
  )
}

export function SalvageShipsScreen() {
  const vehicles = useUex<Vehicle[]>('vehicles')
  const purchases = useUex<VehiclePrice[]>('vehicles_purchases_prices_all')
  const rentals = useUex<VehicleRent[]>('vehicles_rentals_prices_all')
  return (
    <Loaded states={all(vehicles, purchases, rentals)}>
      {() => <SalvageShipsView vehicles={vehicles.data!} purchases={purchases.data!} rentals={rentals.data!} now={Date.now()} />}
    </Loaded>
  )
}

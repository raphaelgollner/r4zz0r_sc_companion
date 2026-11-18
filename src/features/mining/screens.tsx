import { useCallback, useMemo, useState } from 'react'
import type {
  Commodity,
  Moon,
  Planet,
  PriceRow,
  RawPriceRow,
  RefineryCapacity,
  RefineryMethod,
  RefineryYield,
  Terminal,
  Item,
  ItemAttribute,
  ItemPrice,
  Vehicle,
  VehiclePrice,
  VehicleRent,
} from '../../data/types'
import { useUex, type UexState } from '../../data/useUex'
import { Loaded } from '../trade/screens'
import { GroundView } from './GroundView'
import { OresView } from './OresView'
import { RefineriesView } from './RefineriesView'
import { DistanceFetcher } from './DistanceFetcher'
import { PlannerView } from './PlannerView'
import { EQUIPMENT_CATEGORY, EquipmentView, type EquipmentKind } from './EquipmentView'
import { QUERY_TTL } from '../../data/ttl'
import { useUexQuery } from '../../data/useUex'
import { useMinerPrefs } from '../../store/minerPrefs'
import { distancesFor, refineryMatrix } from '../../domain/mining'

const toMap = <T extends { id: number }>(list: T[] | null) => new Map((list ?? []).map((x) => [x.id, x]))
const all = (...s: UexState<unknown>[]) => s

export function useMiningBase() {
  const commodities = useUex<Commodity[]>('commodities')
  const prices = useUex<PriceRow[]>('commodities_prices_all')
  const rawPrices = useUex<RawPriceRow[]>('commodities_raw_prices_all')
  const planets = useUex<Planet[]>('planets')
  const moons = useUex<Moon[]>('moons')
  const planetMap = useMemo(() => toMap(planets.data), [planets.data])
  const moonMap = useMemo(() => toMap(moons.data), [moons.data])
  return { commodities, prices, rawPrices, planets, moons, planetMap, moonMap }
}

export function OresScreen() {
  const b = useMiningBase()
  return (
    <Loaded states={all(b.commodities, b.prices, b.rawPrices, b.planets, b.moons)}>
      {() => (
        <OresView commodities={b.commodities.data!} rawPrices={b.rawPrices.data!} prices={b.prices.data!} planets={b.planetMap} moons={b.moonMap} now={Date.now()} />
      )}
    </Loaded>
  )
}

export function RefineriesScreen() {
  const yields = useUex<RefineryYield[]>('refineries_yields')
  const capacities = useUex<RefineryCapacity[]>('refineries_capacities')
  const methods = useUex<RefineryMethod[]>('refineries_methods')
  return (
    <Loaded states={all(yields, capacities, methods)}>
      {() => <RefineriesView yields={yields.data!} capacities={capacities.data!} methods={methods.data!} />}
    </Loaded>
  )
}

export function GroundScreen() {
  const b = useMiningBase()
  const vehicles = useUex<Vehicle[]>('vehicles')
  const purchases = useUex<VehiclePrice[]>('vehicles_purchases_prices_all')
  const rentals = useUex<VehicleRent[]>('vehicles_rentals_prices_all')
  return (
    <Loaded states={all(b.commodities, b.prices, b.planets, b.moons, vehicles, purchases, rentals)}>
      {() => (
        <GroundView
          commodities={b.commodities.data!}
          prices={b.prices.data!}
          planets={b.planetMap}
          moons={b.moonMap}
          vehicles={vehicles.data!}
          purchases={purchases.data!}
          rentals={rentals.data!}
          now={Date.now()}
        />
      )}
    </Loaded>
  )
}

export function PlannerScreen() {
  const b = useMiningBase()
  const yields = useUex<RefineryYield[]>('refineries_yields')
  const terminals = useUex<Terminal[]>('terminals')
  const [prefs, setPrefs] = useMinerPrefs()
  const [distances, setDistances] = useState<Map<string, number | null>>(new Map())
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
  const refineryIds = useMemo(() => refineryMatrix(yields.data ?? []).terminals.map((x) => x.id), [yields.data])
  const hasCargo = prefs.cargo.some((l) => l.scu > 0 && l.oreId > 0)
  const distMap = useMemo(() => distancesFor(prefs.locationId, refineryIds, distances), [distances, refineryIds, prefs.locationId])
  const tradeTerminals = useMemo(() => (terminals.data ?? []).filter((x) => x.type !== 'item' && x.type !== 'fuel'), [terminals.data])

  return (
    <Loaded states={all(b.commodities, b.prices, b.rawPrices, yields, terminals)}>
      {() => (
        <>
          {prefs.locationId !== null &&
            hasCargo &&
            refineryIds.map((id) =>
              id === prefs.locationId ? null : <DistanceFetcher key={`${prefs.locationId}:${id}`} origin={prefs.locationId!} destination={id} onDistance={onDistance} />,
            )}
          <PlannerView
            commodities={b.commodities.data!}
            yields={yields.data!}
            prices={b.prices.data!}
            rawPrices={b.rawPrices.data!}
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

export function EquipmentScreen() {
  const [kind, setKind] = useState<EquipmentKind>('lasers')
  const params = { id_category: EQUIPMENT_CATEGORY[kind] }
  const items = useUexQuery<Item[]>('items', params, QUERY_TTL.items)
  const attrs = useUexQuery<ItemAttribute[]>('items_attributes', params, QUERY_TTL.items_attributes)
  const prices = useUexQuery<ItemPrice[]>('items_prices', params, QUERY_TTL.items_prices)
  return (
    <Loaded states={all(items, attrs, prices)}>
      {() => <EquipmentView kind={kind} onKind={setKind} items={items.data!} attrs={attrs.data!} prices={prices.data!} now={Date.now()} />}
    </Loaded>
  )
}

import { useMemo } from 'react'
import type {
  Commodity,
  Moon,
  Planet,
  PriceRow,
  RawPriceRow,
  RefineryCapacity,
  RefineryMethod,
  RefineryYield,
  Vehicle,
  VehiclePrice,
  VehicleRent,
} from '../../data/types'
import { useUex, type UexState } from '../../data/useUex'
import { Loaded } from '../trade/screens'
import { GroundView } from './GroundView'
import { OresView } from './OresView'
import { RefineriesView } from './RefineriesView'

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

import type { Vehicle, VehiclePrice, VehicleRent } from '../../data/types'
import { useUex, type UexState } from '../../data/useUex'
import { Loaded } from '../trade/screens'
import { ShipsView } from './ShipsView'

export function ShipsScreen() {
  const vehicles = useUex<Vehicle[]>('vehicles')
  const purchases = useUex<VehiclePrice[]>('vehicles_purchases_prices_all')
  const rentals = useUex<VehicleRent[]>('vehicles_rentals_prices_all')
  return (
    <Loaded states={[vehicles, purchases, rentals] as UexState<unknown>[]}>
      {() => <ShipsView vehicles={vehicles.data!} purchases={purchases.data!} rentals={rentals.data!} now={Date.now()} />}
    </Loaded>
  )
}

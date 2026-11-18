import type { PledgePrice, Vehicle, VehiclePrice, VehicleRent } from '../../data/types'
import { useUex, type UexState } from '../../data/useUex'
import { useFleet } from '../../store/fleet'
import { usePrefs } from '../../store/prefs'
import { Loaded } from '../trade/screens'
import { FleetView } from './FleetView'

export function FleetScreen() {
  const vehicles = useUex<Vehicle[]>('vehicles')
  const pledge = useUex<PledgePrice[]>('vehicles_prices')
  const purchases = useUex<VehiclePrice[]>('vehicles_purchases_prices_all')
  const rentals = useUex<VehicleRent[]>('vehicles_rentals_prices_all')
  const fleet = useFleet()
  const [prefs] = usePrefs()
  return (
    <Loaded states={[vehicles, pledge, purchases, rentals] as UexState<unknown>[]}>
      {() => (
        <FleetView
          entries={fleet.entries}
          vehicles={vehicles.data!}
          pledge={pledge.data!}
          purchases={purchases.data!}
          rentals={rentals.data!}
          prefs={prefs}
          now={Date.now()}
          onAdd={fleet.add}
          onUpdate={fleet.update}
          onRemove={fleet.remove}
          onOpenSetup={() => {}}
        />
      )}
    </Loaded>
  )
}

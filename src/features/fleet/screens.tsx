import { useState } from 'react'
import type { PledgePrice, Vehicle, VehiclePrice, VehicleRent } from '../../data/types'
import { useUex, type UexState } from '../../data/useUex'
import { usdPrice } from '../../domain/fleet'
import { useFleet } from '../../store/fleet'
import { usePrefs } from '../../store/prefs'
import { Loaded } from '../trade/screens'
import { FleetView } from './FleetView'
import { SetupDialog } from './SetupDialog'

export function FleetScreen() {
  const vehicles = useUex<Vehicle[]>('vehicles')
  const pledge = useUex<PledgePrice[]>('vehicles_prices')
  const purchases = useUex<VehiclePrice[]>('vehicles_purchases_prices_all')
  const rentals = useUex<VehicleRent[]>('vehicles_rentals_prices_all')
  const fleet = useFleet()
  const [prefs] = usePrefs()
  const [setupId, setSetupId] = useState<string | null>(null)
  return (
    <Loaded states={[vehicles, pledge, purchases, rentals] as UexState<unknown>[]}>
      {() => {
        const entry = fleet.entries.find((e) => e.id === setupId) ?? null
        const vehicle = entry ? vehicles.data!.find((v) => v.id === entry.vehicleId) ?? null : null
        return (
          <>
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
              onOpenSetup={setSetupId}
            />
            {entry && vehicle && (
              <SetupDialog
                entry={entry}
                vehicle={vehicle}
                usd={usdPrice(vehicle.id, pledge.data!)}
                onUpdate={(patch) => fleet.update(entry.id, patch)}
                onClose={() => setSetupId(null)}
              />
            )}
          </>
        )
      }}
    </Loaded>
  )
}

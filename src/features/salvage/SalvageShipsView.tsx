import { useMemo } from 'react'
import type { Vehicle, VehiclePrice, VehicleRent } from '../../data/types'
import { ShipsView } from '../ships/ShipsView'

export function SalvageShipsView({ vehicles, purchases, rentals, now }: { vehicles: Vehicle[]; purchases: VehiclePrice[]; rentals: VehicleRent[]; now: number }) {
  const salvage = useMemo(() => vehicles.filter((v) => v.is_salvage), [vehicles])
  return <ShipsView vehicles={salvage} purchases={purchases} rentals={rentals} now={now} />
}

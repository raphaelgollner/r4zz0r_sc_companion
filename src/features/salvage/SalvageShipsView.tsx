import { useMemo } from 'react'
import type { Vehicle, VehiclePrice, VehicleRent } from '../../data/types'
import { ShipsView } from '../ships/ShipsView'

/** Naves de salvage: a mesma tela de NAVES, só com as que têm a flag de salvage no UEX. */
export function SalvageShipsView({ vehicles, purchases, rentals, now }: { vehicles: Vehicle[]; purchases: VehiclePrice[]; rentals: VehicleRent[]; now: number }) {
  const salvage = useMemo(() => vehicles.filter((v) => v.is_salvage), [vehicles])
  return <ShipsView vehicles={salvage} purchases={purchases} rentals={rentals} now={now} />
}

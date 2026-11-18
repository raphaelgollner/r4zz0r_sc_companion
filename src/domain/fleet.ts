import type { PledgePrice, Vehicle, VehiclePrice } from '../data/types'

/** Uma nave da frota pessoal. A mesma nave pode aparecer mais de uma vez. */
export interface FleetEntry {
  id: string
  vehicleId: number
  nickname: string
  note: string
  addedAt: number
  /** Setup salvo: caminho da porta → uuid do item escolhido. */
  setup: Record<string, string>
}

/** Preço de pledge em dólar: a linha USD mais recente com preço. */
export function usdPrice(vehicleId: number, prices: PledgePrice[]): number | null {
  let best: PledgePrice | null = null
  for (const p of prices)
    if (p.id_vehicle === vehicleId && p.currency === 'USD' && p.price > 0 && (!best || p.date_modified > best.date_modified)) best = p
  return best ? best.price : null
}

/** Oferta mais barata em aUEC. */
export function bestAuec(vehicleId: number, purchases: VehiclePrice[]): VehiclePrice | null {
  let best: VehiclePrice | null = null
  for (const p of purchases) if (p.id_vehicle === vehicleId && p.price_buy > 0 && (!best || p.price_buy < best.price_buy)) best = p
  return best
}

export interface FleetTotals {
  /** Naves conhecidas pelo UEX. */
  count: number
  usd: number
  auec: number
  missingUsd: number
  missingAuec: number
  /** Entradas cuja nave não existe mais no UEX. */
  unknown: number
}

/** Totais da frota: só o preço base de cada nave; o que não tem preço fica de fora e é contado. */
export function fleetTotals(entries: FleetEntry[], vehicles: Map<number, Vehicle>, pledge: PledgePrice[], purchases: VehiclePrice[]): FleetTotals {
  const t: FleetTotals = { count: 0, usd: 0, auec: 0, missingUsd: 0, missingAuec: 0, unknown: 0 }
  for (const e of entries) {
    if (!vehicles.has(e.vehicleId)) {
      t.unknown++
      continue
    }
    t.count++
    const usd = usdPrice(e.vehicleId, pledge)
    if (usd === null) t.missingUsd++
    else t.usd += usd
    const auec = bestAuec(e.vehicleId, purchases)
    if (!auec) t.missingAuec++
    else t.auec += auec.price_buy
  }
  return t
}

export type ShipFunction = 'cargo' | 'mining' | 'salvage' | 'tractor' | 'ground'

/** Funções da nave pelas flags do UEX (só para rótulo). */
export function shipFunctions(v: Vehicle): ShipFunction[] {
  const out: ShipFunction[] = []
  if (v.is_cargo) out.push('cargo')
  if (v.is_mining) out.push('mining')
  if (v.is_salvage) out.push('salvage')
  if (v.is_tractor_beam) out.push('tractor')
  if (v.is_ground_vehicle) out.push('ground')
  return out
}

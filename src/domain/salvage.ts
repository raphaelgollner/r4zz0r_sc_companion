import type { Commodity, PriceRow } from '../data/types'

/** Materiais que o salvage rende, pelo código do UEX, na ordem da tela. */
export const SALVAGE_CODES = ['RMC', 'CMAT', 'SCRA', 'WAST']

export function salvageMaterials(commodities: Commodity[]): Commodity[] {
  return SALVAGE_CODES.map((code) => commodities.find((c) => c.code === code)).filter((c): c is Commodity => !!c)
}

export interface SalvageLine {
  commodityId: number
  scu: number
}

export interface SalvagePlanRow {
  terminalId: number
  terminalName: string
  /** Σ SCU × preço de venda dos materiais que o terminal compra. */
  value: number
  /** Materiais com demanda conhecida menor que a carga. */
  short: number[]
  /** Materiais da carga que o terminal não compra. */
  missing: number[]
  distance: number | null
  /** Linhas de preço usadas (para mostrar preço e data). */
  rows: PriceRow[]
}

const valid = (cargo: SalvageLine[]) => cargo.filter((l) => l.commodityId > 0 && Number.isFinite(l.scu) && l.scu > 0)
/** Demanda do terminal: a atual ou, sem ela, a média (como nas rotas). */
const demandOf = (r: PriceRow) => (r.scu_sell > 0 ? r.scu_sell : r.scu_sell_avg)

export function salvagePlan(cargo: SalvageLine[], prices: PriceRow[], distance: (terminalId: number) => number | null, sortBy: 'value' | 'distance'): SalvagePlanRow[] {
  const lines = valid(cargo)
  if (!lines.length) return []
  const ids = new Set(lines.map((l) => l.commodityId))
  const byTerminal = new Map<number, PriceRow[]>()
  for (const p of prices) if (ids.has(p.id_commodity) && p.price_sell > 0) byTerminal.set(p.id_terminal, [...(byTerminal.get(p.id_terminal) ?? []), p])

  const rows: SalvagePlanRow[] = [...byTerminal].map(([terminalId, list]) => {
    let value = 0
    const short: number[] = []
    const missing: number[] = []
    for (const l of lines) {
      const r = list.find((x) => x.id_commodity === l.commodityId)
      if (!r) {
        missing.push(l.commodityId)
        continue
      }
      value += l.scu * r.price_sell
      const demand = demandOf(r)
      if (demand > 0 && demand < l.scu) short.push(l.commodityId)
    }
    return { terminalId, terminalName: list[0].terminal_name, value, short, missing, distance: distance(terminalId), rows: list }
  })
  if (sortBy === 'distance') rows.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity) || b.value - a.value)
  else rows.sort((a, b) => b.value - a.value)
  return rows
}

/** A carga digitada passa da capacidade da nave? Capacidade 0 = desconhecida, sem aviso. */
export function capacityWarning(cargo: SalvageLine[], scu: number): boolean {
  if (!(scu > 0)) return false
  return valid(cargo).reduce((s, l) => s + l.scu, 0) > scu
}

import type { Commodity, ItemAttribute, PriceRow, RawPriceRow, RefineryYield } from '../data/types'

const SUFFIX = / \((Raw|Ore)\)$/

/** É minério bruto (nome termina em "(Raw)" ou "(Ore)"). */
export const isRawOre = (c: Commodity) => SUFFIX.test(c.name)

/** Commodity refinada correspondente: mesmo nome sem "(Raw)"/"(Ore)". */
export function refinedOf(raw: Commodity, all: Commodity[]): Commodity | null {
  if (!SUFFIX.test(raw.name)) return null
  const name = raw.name.replace(SUFFIX, '')
  return all.find((c) => c.name === name) ?? null
}

export interface OreRow {
  ore: Commodity
  refined: Commodity | null
  bestRaw: RawPriceRow | null
  bestRefined: PriceRow | null
  /** Quanto o refinado vale a mais que o bruto, em %. */
  uplift: number | null
}

function best<T>(rows: T[], price: (r: T) => number): T | null {
  let out: T | null = null
  for (const r of rows) if (price(r) > 0 && (!out || price(r) > price(out))) out = r
  return out
}

export function oreSummary(raws: Commodity[], all: Commodity[], rawPrices: RawPriceRow[], prices: PriceRow[]): OreRow[] {
  return raws.map((ore) => {
    const refined = refinedOf(ore, all)
    const bestRaw = best(rawPrices.filter((p) => p.id_commodity === ore.id), (p) => p.price_sell)
    const bestRefined = refined ? best(prices.filter((p) => p.id_commodity === refined.id), (p) => p.price_sell) : null
    const uplift = bestRaw && bestRefined ? (bestRefined.price_sell / bestRaw.price_sell - 1) * 100 : null
    return { ore, refined, bestRaw, bestRefined, uplift }
  })
}

export function refineryMatrix(yields: RefineryYield[]) {
  const terminals = new Map<number, string>()
  const ores = new Map<number, string>()
  const values = new Map<string, number>()
  for (const r of yields) {
    terminals.set(r.id_terminal, r.terminal_name)
    ores.set(r.id_commodity, r.commodity_name)
    values.set(`${r.id_terminal}:${r.id_commodity}`, r.value)
  }
  const sorted = (m: Map<number, string>) => [...m].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
  return {
    terminals: sorted(terminals),
    ores: sorted(ores),
    value: (terminalId: number, oreId: number): number | null => values.get(`${terminalId}:${oreId}`) ?? null,
  }
}

export interface CargoLine {
  oreId: number
  scu: number
}

export interface RefinePlanRow {
  terminalId: number
  terminalName: string
  /** Bônus médio da refinaria para a carga, ponderado por SCU (%). */
  avgBonus: number
  /** Σ SCU × melhor preço do refinado × (1 + bônus/100). Estimativa. */
  estValue: number
  /** Minérios da carga sem preço de refinado (ficam fora do valor). */
  missingPrice: number[]
  distance: number | null
}

const validCargo = (cargo: CargoLine[]) => cargo.filter((c) => Number.isFinite(c.scu) && c.scu > 0)

export function refinePlan(
  cargo: CargoLine[],
  yields: RefineryYield[],
  refinedPrice: (oreId: number) => number | null,
  distance: (terminalId: number) => number | null,
  refineries: { id: number; name: string }[],
  sortBy: 'value' | 'distance',
): RefinePlanRow[] {
  const lines = validCargo(cargo)
  if (lines.length === 0) return []
  const m = refineryMatrix(yields)
  const totalScu = lines.reduce((s, l) => s + l.scu, 0)

  const rows = refineries.map((r) => {
    let est = 0
    let weighted = 0
    const missing: number[] = []
    for (const l of lines) {
      const bonus = m.value(r.id, l.oreId) ?? 0
      weighted += bonus * l.scu
      const p = refinedPrice(l.oreId)
      if (p === null || !(p > 0)) missing.push(l.oreId)
      else est += l.scu * p * (1 + bonus / 100)
    }
    return { terminalId: r.id, terminalName: r.name, avgBonus: weighted / totalScu, estValue: est, missingPrice: missing, distance: distance(r.id) }
  })

  if (sortBy === 'distance')
    rows.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity) || b.estValue - a.estValue)
  else rows.sort((a, b) => b.estValue - a.estValue)
  return rows
}

export function sellRawValue(cargo: CargoLine[], bestRawPrice: (oreId: number) => number | null): number {
  return validCargo(cargo).reduce((s, l) => {
    const p = bestRawPrice(l.oreId)
    return p && p > 0 ? s + l.scu * p : s
  }, 0)
}

/** Valor de um atributo de item com a unidade ("-10 %"); vazio ou ausente → null. */
export function attr(attrs: ItemAttribute[], itemId: number, name: string): string | null {
  const a = attrs.find((x) => x.id_item === itemId && x.attribute_name === name)
  if (!a || a.value === '' || a.value === null) return null
  return a.unit ? `${a.value} ${a.unit}` : a.value
}

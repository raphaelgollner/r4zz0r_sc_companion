const int = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })
const pct = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const dec2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const ok = (n: number) => Number.isFinite(n)

export const formatAuec = (n: number) => (ok(n) ? int.format(n) : '—')
export const formatScu = (n: number) => (ok(n) ? `${int.format(n)} SCU` : '—')
export const formatPercent = (n: number) => (ok(n) ? `${pct.format(n)}%` : '—')
export const formatDecimal = (n: number) => (ok(n) ? dec2.format(n) : '—')


/**
 * Lê um valor digitado como número, aceitando formato pt-BR ("1.200.000,50") e EN ("1,200,000").
 * Vazio ou inválido → NaN.
 */
export function parseAmount(text: string): number {
  let t = text.trim().replace(/\s/g, '')
  if (t === '') return NaN
  const hasDot = t.includes('.')
  const hasComma = t.includes(',')
  if (hasDot && hasComma) {
    // o separador que aparece por último é o decimal
    t = t.lastIndexOf(',') > t.lastIndexOf('.') ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '')
  } else if (hasComma) {
    t = /^-?\d{1,3}(,\d{3})+$/.test(t) ? t.replace(/,/g, '') : t.replace(',', '.')
  } else if (hasDot && /^-?\d{1,3}(\.\d{3})+$/.test(t)) {
    t = t.replace(/\./g, '')
  }
  if (!/^-?\d+(\.\d+)?$/.test(t)) return NaN
  return Number(t)
}

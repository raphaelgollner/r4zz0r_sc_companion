const int = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })
const pct = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const dec2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const ok = (n: number) => Number.isFinite(n)

export const formatAuec = (n: number) => (ok(n) ? int.format(n) : '—')
export const formatScu = (n: number) => (ok(n) ? `${int.format(n)} SCU` : '—')
export const formatPercent = (n: number) => (ok(n) ? `${pct.format(n)}%` : '—')
export const formatDecimal = (n: number) => (ok(n) ? dec2.format(n) : '—')


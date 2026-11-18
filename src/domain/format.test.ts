import { describe, expect, test } from 'vitest'
import { formatAuec, formatDecimal, formatPercent, formatScu } from './format'

describe('format', () => {
  test('formatAuec usa ponto de milhar e arredonda', () => {
    expect(formatAuec(1200000)).toBe('1.200.000')
    expect(formatAuec(15782.4)).toBe('15.782')
  })
  test('formatDecimal com 2 casas', () => expect(formatDecimal(637.9)).toBe('637,90'))
  test('formatScu', () => expect(formatScu(576)).toBe('576 SCU'))
  test('formatPercent com 1 casa e vírgula', () => expect(formatPercent(16.43)).toBe('16,4%'))
  test('valores inválidos viram travessão', () => {
    expect(formatAuec(NaN)).toBe('—')
    expect(formatAuec(Infinity)).toBe('—')
    expect(formatPercent(NaN)).toBe('—')
  })
})

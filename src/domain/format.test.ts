import { describe, expect, test } from 'vitest'
import { formatAuec, formatDecimal, formatPercent, formatScu, parseAmount } from './format'

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

describe('parseAmount', () => {
  test('aceita com e sem ponto de milhar', () => {
    expect(parseAmount('1.200.000')).toBe(1_200_000)
    expect(parseAmount('1200000')).toBe(1_200_000)
    expect(parseAmount(' 500 ')).toBe(500)
  })
  test('vazio ou texto inválido vira NaN', () => {
    expect(parseAmount('')).toBeNaN()
    expect(parseAmount('abc')).toBeNaN()
  })
})

describe('parseAmount com vírgula de milhar (formato EN)', () => {
  test('vírgula seguida de 3 dígitos é milhar', () => {
    expect(parseAmount('1,200,000')).toBe(1_200_000)
    expect(parseAmount('1,200')).toBe(1_200)
  })
  test('formato pt-BR com decimais', () => {
    expect(parseAmount('1.200.000,50')).toBe(1_200_000.5)
    expect(parseAmount('1,5')).toBe(1.5)
  })
})

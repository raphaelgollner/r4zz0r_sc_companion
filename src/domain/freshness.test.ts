import { describe, expect, test } from 'vitest'
import { ageLevel, formatAge } from './freshness'

const now = 1_800_000_000_000
const sec = now / 1000

describe('ageLevel', () => {
  test('1 h é fresh', () => expect(ageLevel(sec - 3600, now)).toBe('fresh'))
  test('25 h é aging', () => expect(ageLevel(sec - 25 * 3600, now)).toBe('aging'))
  test('8 dias é stale', () => expect(ageLevel(sec - 8 * 86400, now)).toBe('stale'))
  test('0 e null são unknown', () => {
    expect(ageLevel(0, now)).toBe('unknown')
    expect(ageLevel(null, now)).toBe('unknown')
    expect(ageLevel(undefined, now)).toBe('unknown')
  })
  test('limites configuráveis', () => {
    expect(ageLevel(sec - 13 * 3600, now, 12)).toBe('aging')
    expect(ageLevel(sec - 3 * 86400, now, 24, 2)).toBe('stale')
  })
})

describe('formatAge', () => {
  test('30 s → agora', () => expect(formatAge(sec - 30, now)).toBe('agora'))
  test('5 min', () => expect(formatAge(sec - 300, now)).toBe('há 5 min'))
  test('3 h', () => expect(formatAge(sec - 3 * 3600, now)).toBe('há 3 h'))
  test('3 dias', () => expect(formatAge(sec - 3 * 86400, now)).toBe('há 3 dias'))
  test('1 dia no singular', () => expect(formatAge(sec - 50 * 3600, now)).toBe('há 2 dias'))
  test('null → data desconhecida', () => expect(formatAge(null, now)).toBe('data desconhecida'))
})

describe('formatAge em inglês', () => {
  test('agora, minutos, horas, dias e desconhecida', () => {
    expect(formatAge(sec - 30, now, 'en')).toBe('now')
    expect(formatAge(sec - 300, now, 'en')).toBe('5 min ago')
    expect(formatAge(sec - 3 * 3600, now, 'en')).toBe('3 h ago')
    expect(formatAge(sec - 3 * 86400, now, 'en')).toBe('3 days ago')
    expect(formatAge(null, now, 'en')).toBe('unknown date')
  })
})

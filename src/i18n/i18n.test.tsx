import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, test } from 'vitest'
import { en, pt } from './dict'
import { I18nProvider, useI18n } from './i18n'

const wrapper = ({ children }: { children: ReactNode }) => <I18nProvider>{children}</I18nProvider>

describe('i18n', () => {
  beforeEach(() => localStorage.clear())

  test('pt e en têm as mesmas chaves', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(pt).sort())
  })

  test('padrão é pt e interpola variáveis', () => {
    const { result } = renderHook(() => useI18n(), { wrapper })
    expect(result.current.lang).toBe('pt')
    expect(result.current.t('footer.updated', { age: 'há 5 min' })).toBe('atualizado há 5 min')
  })

  test('troca de idioma é salva e restaurada', () => {
    const { result, unmount } = renderHook(() => useI18n(), { wrapper })
    act(() => result.current.setLang('en'))
    expect(result.current.t('tab.ships')).toBe('SHIPS')
    unmount()
    const again = renderHook(() => useI18n(), { wrapper })
    expect(again.result.current.lang).toBe('en')
  })

  test('localStorage com valor inválido volta para pt', () => {
    localStorage.setItem('tayko.lang', 'xx')
    const { result } = renderHook(() => useI18n(), { wrapper })
    expect(result.current.lang).toBe('pt')
  })
})

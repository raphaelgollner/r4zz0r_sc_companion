import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { en, pt, type DictKey } from './dict'

export type Lang = 'pt' | 'en'

const STORAGE_KEY = 'tayko.lang'
const dicts: Record<Lang, Record<DictKey, string>> = { pt, en }

function loadLang(): Lang {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === 'en' || v === 'pt' ? v : 'pt'
  } catch {
    return 'pt'
  }
}

export type TFunction = (key: DictKey, vars?: Record<string, string | number>) => string

interface I18nValue {
  lang: Lang
  setLang: (l: Lang) => void
  t: TFunction
}

const I18nContext = createContext<I18nValue | null>(null)

export function I18nProvider({ initial, children }: { initial?: Lang; children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => initial ?? loadLang())

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    try {
      localStorage.setItem(STORAGE_KEY, l)
    } catch {
      // sem armazenamento: vale só nesta sessão
    }
  }, [])

  const t = useCallback<TFunction>(
    (key, vars) => {
      let s = dicts[lang][key] ?? key
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v))
      return s
    },
    [lang],
  )

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const v = useContext(I18nContext)
  if (!v) throw new Error('useI18n precisa de <I18nProvider>')
  return v
}

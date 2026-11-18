import { createStore, get, set } from 'idb-keyval'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { KVStore } from '../cache/store'
import { EMPTY_PROGRESS, type ProgressData } from '../domain/progress'

const KEY = 'data'
/** Atraso para juntar várias mudanças seguidas (ex.: digitação) numa só gravação. */
const WRITE_DELAY_MS = 400

/** Banco separado do cache do UEX: "Limpar cache" não apaga o progresso. */
export function progressStore(): KVStore {
  const db = createStore('tayko-companion-progress', 'progress')
  return {
    get: (key) => get(key, db),
    set: (key, value) => set(key, value, db),
    clear: async () => {
      // nunca limpamos o progresso por aqui
    },
  }
}

interface ProgressValue {
  data: ProgressData
  ready: boolean
  /** true quando não deu para ler o progresso salvo: nada é gravado para não sobrescrever. */
  loadFailed: boolean
  apply: (fn: (d: ProgressData) => ProgressData) => void
}

const ProgressContext = createContext<ProgressValue | null>(null)

let defaultStore: KVStore | null = null

export function ProgressProvider({ store, children }: { store?: KVStore; children: ReactNode }) {
  const kv = useMemo(() => store ?? (defaultStore ??= progressStore()), [store])
  const [data, setData] = useState<ProgressData>(EMPTY_PROGRESS)
  const [ready, setReady] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const loadFailedRef = useRef(false)
  const dataRef = useRef(data)
  const pending = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    if (!pending.current) return
    pending.current = false
    kv.set(KEY, dataRef.current).catch(() => {
      // falha ao gravar: segue em memória nesta sessão
    })
  }, [kv])

  useEffect(() => {
    let active = true
    kv.get(KEY)
      .then((raw) => {
        if (!active) return
        const loaded = raw && typeof raw === 'object' ? { ...EMPTY_PROGRESS, ...(raw as ProgressData) } : EMPTY_PROGRESS
        dataRef.current = loaded
        setData(loaded)
      })
      .catch(() => {
        loadFailedRef.current = true
        if (active) setLoadFailed(true)
      })
      .finally(() => active && setReady(true))
    return () => {
      active = false
    }
  }, [kv])

  const apply = useCallback(
    (fn: (d: ProgressData) => ProgressData) => {
      if (loadFailedRef.current) return
      const next = fn(dataRef.current)
      dataRef.current = next
      setData(next)
      pending.current = true
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(flush, WRITE_DELAY_MS)
    },
    [kv, flush],
  )

  // Grava o que estiver pendente ao fechar, minimizar ou desmontar.
  useEffect(() => {
    const onHide = () => document.visibilityState === 'hidden' && flush()
    window.addEventListener('beforeunload', flush)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      window.removeEventListener('beforeunload', flush)
      document.removeEventListener('visibilitychange', onHide)
      flush()
    }
  }, [flush])

  const value = useMemo(() => ({ data, ready, loadFailed, apply }), [data, ready, loadFailed, apply])
  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
}

export function useProgress(): ProgressValue {
  const v = useContext(ProgressContext)
  if (!v) throw new Error('useProgress precisa de <ProgressProvider>')
  return v
}

/** Saldo atual, ou null sem ProgressProvider/sem lançamentos (usado pelo botão "Usar meu saldo"). */
export function useOptionalBalance(): number | null {
  const v = useContext(ProgressContext)
  if (!v || v.data.txs.length === 0) return null
  return v.data.txs.reduce((s, t) => s + t.amount, 0)
}

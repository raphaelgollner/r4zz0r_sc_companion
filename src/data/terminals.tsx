import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { Terminal } from './types'
import { useUex } from './useUex'

/** Todos os terminais do UEX por id, para qualquer tela mostrar nome do lugar e localização. */
export const TerminalsContext = createContext<Map<number, Terminal>>(new Map())

export function TerminalsProvider({ children }: { children: ReactNode }) {
  const terminals = useUex<Terminal[]>('terminals')
  const map = useMemo(() => new Map((terminals.data ?? []).map((t) => [t.id, t])), [terminals.data])
  return <TerminalsContext.Provider value={map}>{children}</TerminalsContext.Provider>
}

export function useTerminal(id: number): Terminal | null {
  return useContext(TerminalsContext).get(id) ?? null
}

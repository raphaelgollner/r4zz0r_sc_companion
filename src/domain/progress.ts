/** Controle manual do dinheiro do jogador: saldo, lançamentos e sessões de jogo. */

export type TxCategory = 'trade' | 'mining' | 'salvage' | 'fuel' | 'repair' | 'purchase' | 'other'
export const TX_CATEGORIES: TxCategory[] = ['trade', 'mining', 'salvage', 'fuel', 'repair', 'purchase', 'other']

export interface Tx {
  id: string
  /** Positivo = entrada, negativo = saída. */
  amount: number
  /** 'adjust' = correção do saldo; não conta como ganho de sessão. */
  kind: 'normal' | 'adjust'
  category: TxCategory
  description: string
  at: number
  sessionId: string | null
}

export interface Session {
  id: string
  startedAt: number
  endedAt: number | null
}

export interface Profile {
  name: string
  photo: string | null
}

export interface ProgressData {
  profile: Profile
  txs: Tx[]
  sessions: Session[]
}

export const EMPTY_PROGRESS: ProgressData = { profile: { name: '', photo: null }, txs: [], sessions: [] }

export function balance(txs: Tx[]): number {
  return txs.reduce((sum, t) => sum + t.amount, 0)
}

export function activeSession(d: ProgressData): Session | null {
  return d.sessions.find((s) => s.endedAt === null) ?? null
}

export function sessionSummary(s: Session, txs: Tx[], now: number) {
  const own = txs.filter((t) => t.sessionId === s.id && t.kind === 'normal')
  const income = own.filter((t) => t.amount > 0).reduce((a, t) => a + t.amount, 0)
  const expense = own.filter((t) => t.amount < 0).reduce((a, t) => a - t.amount, 0)
  return { income, expense, net: income - expense, durationMs: (s.endedAt ?? now) - s.startedAt, count: own.length }
}

export function addTx(d: ProgressData, tx: Omit<Tx, 'id' | 'sessionId' | 'kind'>, id: string): ProgressData {
  const session = activeSession(d)
  return { ...d, txs: [...d.txs, { ...tx, id, kind: 'normal', sessionId: session?.id ?? null }] }
}

export function updateTx(d: ProgressData, id: string, patch: Partial<Omit<Tx, 'id'>>): ProgressData {
  return { ...d, txs: d.txs.map((t) => (t.id === id ? { ...t, ...patch } : t)) }
}

export function removeTx(d: ProgressData, id: string): ProgressData {
  return { ...d, txs: d.txs.filter((t) => t.id !== id) }
}

export function setBalance(d: ProgressData, target: number, at: number, id: string): ProgressData {
  const diff = target - balance(d.txs)
  if (diff === 0) return d
  return {
    ...d,
    txs: [...d.txs, { id, amount: diff, kind: 'adjust', category: 'other', description: '', at, sessionId: null }],
  }
}

export function startSession(d: ProgressData, at: number, id: string): ProgressData {
  if (activeSession(d)) return d
  return { ...d, sessions: [...d.sessions, { id, startedAt: at, endedAt: null }] }
}

export function endSession(d: ProgressData, at: number): ProgressData {
  return { ...d, sessions: d.sessions.map((s) => (s.endedAt === null ? { ...s, endedAt: at } : s)) }
}

export function setProfile(d: ProgressData, patch: Partial<Profile>): ProgressData {
  return { ...d, profile: { ...d.profile, ...patch } }
}

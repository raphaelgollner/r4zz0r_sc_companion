import { describe, expect, test } from 'vitest'
import {
  activeSession,
  addTx,
  balance,
  EMPTY_PROGRESS,
  endSession,
  removeTx,
  sessionSummary,
  setBalance,
  setProfile,
  startSession,
  updateTx,
  type ProgressData,
  type Tx,
} from './progress'

const tx = (id: string, amount: number, extra: Partial<Tx> = {}): Tx => ({
  id, amount, kind: 'normal', category: 'trade', description: '', at: 1000, sessionId: null, ...extra,
})

describe('saldo', () => {
  test('soma todas as transações, inclusive ajustes', () => {
    expect(balance([tx('a', 1000, { kind: 'adjust' }), tx('b', 500), tx('c', -200)])).toBe(1300)
  })

  test('setBalance cria ajuste com a diferença', () => {
    let d: ProgressData = { ...EMPTY_PROGRESS, txs: [tx('a', 1300)] }
    d = setBalance(d, 2000, 5000, 'adj')
    expect(d.txs.at(-1)).toMatchObject({ id: 'adj', amount: 700, kind: 'adjust', at: 5000, sessionId: null })
    expect(balance(d.txs)).toBe(2000)
  })

  test('setBalance sem diferença não cria nada', () => {
    const d: ProgressData = { ...EMPTY_PROGRESS, txs: [tx('a', 2000)] }
    expect(setBalance(d, 2000, 5000, 'adj').txs).toHaveLength(1)
  })
})

describe('sessões', () => {
  test('transação criada com sessão ativa fica ligada a ela', () => {
    let d = startSession(EMPTY_PROGRESS, 100, 's1')
    d = addTx(d, { amount: 500, category: 'trade', description: 'Venda', at: 200 }, 't1')
    expect(d.txs[0]).toMatchObject({ id: 't1', sessionId: 's1', kind: 'normal' })
  })

  test('transação sem sessão ativa fica fora de sessão', () => {
    const d = addTx(EMPTY_PROGRESS, { amount: 500, category: 'trade', description: '', at: 200 }, 't1')
    expect(d.txs[0].sessionId).toBeNull()
  })

  test('só uma sessão ativa por vez', () => {
    const d = startSession(startSession(EMPTY_PROGRESS, 100, 's1'), 200, 's2')
    expect(d.sessions).toHaveLength(1)
    expect(activeSession(d)?.id).toBe('s1')
  })

  test('encerrar fecha a sessão ativa', () => {
    const d = endSession(startSession(EMPTY_PROGRESS, 100, 's1'), 900)
    expect(d.sessions[0].endedAt).toBe(900)
    expect(activeSession(d)).toBeNull()
  })

  test('resumo ignora ajustes e usa endedAt', () => {
    let d = startSession(EMPTY_PROGRESS, 0, 's1')
    d = addTx(d, { amount: 500, category: 'trade', description: '', at: 10 }, 'a')
    d = addTx(d, { amount: -200, category: 'fuel', description: '', at: 20 }, 'b')
    d = setBalance(d, 10_000, 30, 'adj')
    d = endSession(d, 3_600_000)
    expect(sessionSummary(d.sessions[0], d.txs, 9_999_999)).toEqual({ income: 500, expense: 200, net: 300, durationMs: 3_600_000, count: 2 })
  })

  test('sessão ativa conta a duração até agora (app reaberto)', () => {
    const d = startSession(EMPTY_PROGRESS, 1_000, 's1')
    expect(sessionSummary(d.sessions[0], d.txs, 61_000).durationMs).toBe(60_000)
  })

  test('editar e excluir numa sessão encerrada recalcula o resumo', () => {
    let d = startSession(EMPTY_PROGRESS, 0, 's1')
    d = addTx(d, { amount: 500, category: 'trade', description: '', at: 10 }, 'a')
    d = addTx(d, { amount: -200, category: 'fuel', description: '', at: 20 }, 'b')
    d = endSession(d, 100)
    d = updateTx(d, 'a', { amount: 800 })
    expect(sessionSummary(d.sessions[0], d.txs, 0).net).toBe(600)
    d = removeTx(d, 'b')
    expect(sessionSummary(d.sessions[0], d.txs, 0)).toMatchObject({ net: 800, expense: 0, count: 1 })
    expect(balance(d.txs)).toBe(800)
  })
})

describe('perfil', () => {
  test('setProfile muda só o que foi passado', () => {
    const d = setProfile(setProfile(EMPTY_PROGRESS, { name: 'Rapha' }), { photo: 'data:x' })
    expect(d.profile).toEqual({ name: 'Rapha', photo: 'data:x' })
  })
})

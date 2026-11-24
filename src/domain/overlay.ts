import type { Terminal, Vehicle } from '../data/types'
import { formatAuec } from './format'
import { parseGameLog, type CargoBox, type LogEvent } from './gamelog'
import { ESTIMATED, importToProgress, type ImportContext } from './importProgress'
import type { ProgressData, Tx } from './progress'

export const CONFIRM_MS = 15_000

export interface LogTail {
  first: string | null
  offset: number
  lines: string[]
}

export interface OverlaySession {
  id: string
  startedAt: number
  endedAt: number | null
  fileFirst: string | null
  offset: number
  lines: string[]
}

export interface BalanceSet {
  id: string
  at: number
  value: number
}

export interface OverlayData {
  sessions: OverlaySession[]
  balanceSets: BalanceSet[]
  names: Record<string, string>
}

export const EMPTY_OVERLAY: OverlayData = { sessions: [], balanceSets: [], names: {} }

export type OverlayOp = 'buy' | 'sell' | 'shop' | 'reward' | 'adjust'

export interface OverlayRow {
  id: string
  at: number
  sessionId: string | null
  op: OverlayOp
  description: string
  amount: number
  commodityName?: string
  scu?: number
  boxes?: CargoBox[]
  autoLoad?: boolean
  pricePerScu?: number
  terminalId?: number
  place?: string
  ship?: string | null
}

export interface OverlayView {
  data: ProgressData
  rows: OverlayRow[]
  balance: number
}

export const activeOverlay = (d: OverlayData) => d.sessions.find((s) => s.endedAt === null) ?? null

export function readingTarget(d: OverlayData, now: number): OverlaySession | null {
  return activeOverlay(d) ?? [...d.sessions].reverse().find((s) => s.endedAt !== null && now - s.endedAt < CONFIRM_MS) ?? null
}

export function startOverlay(d: OverlayData, at: number, id: string, tail: LogTail): OverlayData {
  if (activeOverlay(d)) return d
  return { ...d, sessions: [...d.sessions, { id, startedAt: at, endedAt: null, fileFirst: tail.first, offset: tail.offset, lines: [] }] }
}

export function endOverlay(d: OverlayData, at: number): OverlayData {
  if (!activeOverlay(d)) return d
  return { ...d, sessions: d.sessions.map((s) => (s.endedAt === null ? { ...s, endedAt: at } : s)) }
}

export function appendTail(d: OverlayData, sessionId: string, fromOffset: number, tail: LogTail): OverlayData {
  const s = d.sessions.find((x) => x.id === sessionId)
  if (!s || s.offset !== fromOffset && tail.first === s.fileFirst) return d
  if (!tail.lines.length && tail.offset === s.offset && tail.first === s.fileFirst) return d
  const next = { ...s, fileFirst: tail.first, offset: tail.offset, lines: tail.lines.length ? [...s.lines, ...tail.lines] : s.lines }
  return { ...d, sessions: d.sessions.map((x) => (x.id === s.id ? next : x)) }
}

export function setOverlayBalance(d: OverlayData, value: number, at: number, id: string): OverlayData {
  return { ...d, balanceSets: [...(d.balanceSets ?? []), { id, at, value }] }
}

export function clearOverlay(d: OverlayData): OverlayData {
  return { ...EMPTY_OVERLAY, names: d.names }
}

const MAKERS: Record<string, string> = {
  AEGS: 'Aegis', ANVL: 'Anvil', ARGO: 'Argo', BANU: 'Banu', CNOU: 'Consolidated Outland', CRUS: 'Crusader', DRAK: 'Drake', ESPR: 'Esperia',
  GAMA: 'Gatac', GRIN: 'Greycat', KRIG: 'Kruger', MISC: 'MISC', MRAI: 'Mirai', ORIG: 'Origin', RSI: 'RSI', TMBL: 'Tumbril', XIAN: 'Aopoa', XNAA: 'Aopoa',
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

export function shipName(cls: string | null | undefined, vehicles: Vehicle[]): string | null {
  if (!cls) return null
  const [maker, ...rest] = cls.split('_')
  const human = [MAKERS[maker] ?? maker, ...rest].join(' ')
  const hit = vehicles.find((v) => norm(v.name_full) === norm(human)) ?? vehicles.find((v) => norm(v.name) === norm(rest.join(' ')))
  return hit?.name_full ?? human
}

export function placeLabel(t: Terminal | undefined): string | undefined {
  if (!t) return undefined
  const parts = [t.displayname, t.moon_name ?? t.planet_name, t.star_system_name].filter((x): x is string => !!x)
  return ESTIMATED + [...new Set(parts)].join(' · ')
}

const parsedCache = new WeakMap<OverlaySession, LogEvent[]>()
const parsedPlayer = new WeakMap<OverlaySession, string | null>()

function sessionEvents(s: OverlaySession) {
  let ev = parsedCache.get(s)
  if (!ev) {
    const parsed = parseGameLog({ name: s.id, first: null, last: null, lines: s.lines })
    ev = parsed.events
    parsedCache.set(s, ev)
    parsedPlayer.set(s, parsed.player)
  }
  return ev
}

export function overlayView(d: OverlayData, ctx: ImportContext & { vehicles: Vehicle[] }, now: number, lastRead: number | null = null): OverlayView {
  const reading = readingTarget(d, now)
  const events = new Map<string, LogEvent>()
  const sessions = d.sessions.map((s) => {
    const gate = s === reading ? Math.min(now, lastRead ?? -Infinity) - CONFIRM_MS : Infinity
    const end = s.endedAt ?? Infinity
    const own = sessionEvents(s).filter((e) => e.at >= s.startedAt && e.at <= end && e.at <= gate)
    for (const e of own) events.set(`${s.id}|${e.key}`, e)
    return { id: s.id, startedAt: s.startedAt, endedAt: s.endedAt ?? now, player: parsedPlayer.get(s) ?? null, events: own.map((e) => ({ ...e, key: `${s.id}|${e.key}` })) }
  })
  const base = importToProgress({ importedAt: null, player: null, sessions }, ctx)
  const terminals = new Map(ctx.terminals.map((t) => [t.id, t]))
  const rows: OverlayRow[] = []
  for (const tx of base.txs) {
    const e = events.get(tx.id)
    if (!e) continue
    const row: OverlayRow = { id: tx.id, at: tx.at, sessionId: tx.sessionId, op: e.kind, description: tx.description, amount: tx.amount }
    if (e.kind === 'buy' || e.kind === 'sell') {
      Object.assign(row, {
        commodityName: tx.commodityName,
        scu: tx.scu,
        boxes: e.boxes,
        autoLoad: e.autoLoad,
        pricePerScu: tx.pricePerScu,
        terminalId: tx.terminalId,
        place: (tx.terminalId !== undefined && placeLabel(terminals.get(tx.terminalId))) || tx.terminalName,
        ship: shipName(e.ship, ctx.vehicles),
      })
    }
    rows.push(row)
  }
  const sets = [...(d.balanceSets ?? [])].sort((a, b) => a.at - b.at)
  const adjustments: Tx[] = []
  let prev: BalanceSet | null = null
  for (const b of sets) {
    const since = rows.filter((r) => r.at <= b.at && (!prev || r.at > prev.at)).reduce((sum, r) => sum + r.amount, 0)
    const diff = b.value - ((prev?.value ?? 0) + since)
    adjustments.push({ id: b.id, amount: diff, kind: 'adjust', category: 'other', description: '', at: b.at, sessionId: null })
    prev = b
  }
  const last = sets[sets.length - 1]
  const balance = (last?.value ?? 0) + rows.filter((r) => !last || r.at > last.at).reduce((sum, r) => sum + r.amount, 0)
  for (const a of adjustments) if (a.amount !== 0) rows.push({ id: a.id, at: a.at, sessionId: null, op: 'adjust', description: '', amount: a.amount })
  rows.sort((a, b) => b.at - a.at)
  return {
    data: {
      profile: { name: sessions.map((s) => s.player).filter(Boolean).pop() ?? '', photo: null },
      txs: [...base.txs, ...adjustments],
      sessions: d.sessions.map((s) => ({ id: s.id, startedAt: s.startedAt, endedAt: s.endedAt })),
    },
    rows,
    balance,
  }
}

export const overlayBalance = (_d: OverlayData, v: OverlayView) => v.balance

export const boxesLabel = (boxes: { size: number; count: number }[] | undefined) =>
  boxes && boxes.length ? boxes.map((b) => `${b.count}× ${formatAuec(b.size)} SCU`).join(' + ') : ''

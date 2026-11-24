export interface RawLogFile {
  name: string
  first: string | null
  last: string | null
  lines: string[]
}

interface Base {
  key: string
  at: number
  amount: number
}

export type LogEvent =
  | (Base & { kind: 'buy' | 'sell'; resource: string; scu: number; pricePerScu: number; place: string | null })
  | (Base & { kind: 'shop'; item: string })
  | (Base & { kind: 'reward' })

export interface LogSession {
  id: string
  startedAt: number
  endedAt: number
  player: string | null
  events: LogEvent[]
}

export interface ParsedLog {
  player: string | null
  session: { id: string; startedAt: number; endedAt: number }
  events: LogEvent[]
}

export interface ImportData {
  importedAt: number | null
  player: string | null
  sessions: LogSession[]
}

export const EMPTY_IMPORT: ImportData = { importedAt: null, player: null, sessions: [] }

const FAIL_WINDOW_MS = 15_000

const field = (line: string, name: string) => line.match(new RegExp(`${name}\\[([^\\]]*)\\]`))?.[1]
const num = (line: string, name: string) => {
  const v = Number.parseFloat(field(line, name) ?? '')
  return Number.isFinite(v) ? v : null
}
const stamp = (line: string) => {
  const m = line.match(/^<(\d{4}-\d\d-\d\dT[^>]+)>/)
  const t = m ? Date.parse(m[1]) : NaN
  return Number.isFinite(t) ? t : null
}

const boxScu = (line: string) => {
  const data = line.split('Cargo Box Data:')[1] ?? ''
  let total = 0
  for (const m of data.matchAll(/boxSize\[([\d.]+)\]\s*\|\s*unitAmount\[([\d.]+)\]/g)) total += Number(m[1]) * Number(m[2])
  return total > 0 ? total : null
}

type Pending = { at: number; line: string; kind: 'buy' | 'sell' | 'shop'; idx: number; kiosk: string | undefined }

export function parseGameLog(file: RawLogFile): ParsedLog {
  const events: LogEvent[] = []
  const starts: { at: number; place: string }[] = []
  let player: string | null = null
  const commodity: Pending[] = []
  const shops: Pending[] = []
  const failed = new Set<Pending>()
  const answered = new Set<Pending>()
  const okShops = new Set<Pending>()

  file.lines.forEach((line, idx) => {
    const at = stamp(line)
    if (at === null) return
    const pending = (kind: Pending['kind']): Pending => ({ at, line, kind, idx, kiosk: field(line, 'kioskId') })
    if (line.includes('AccountLoginCharacterStatus_Character')) {
      player = line.match(/ - name (\S+)/)?.[1] ?? line.match(/Character: (\S+)/)?.[1] ?? player
    } else if (line.includes('Projected Start Location is')) {
      const place = line.match(/Projected Start Location is (.+?) for route/)?.[1]?.trim()
      if (place) starts.push({ at, place })
    } else if (line.includes('SendCommodityBuyRequest')) commodity.push(pending('buy'))
    else if (line.includes('SendCommoditySellRequest')) commodity.push(pending('sell'))
    else if (line.includes('CommodityTransactionResponse') && line.includes('Error')) {
      const type = field(line, 'type')
      const kind = type === 'Selling' ? 'sell' : type === 'Buying' ? 'buy' : null
      if (!kind) return
      const req = [...commodity].reverse().find((p) => p.kind === kind && !failed.has(p) && at - p.at <= FAIL_WINDOW_MS)
      if (req) failed.add(req)
    } else if (line.includes('SendShopBuyRequest')) shops.push(pending('shop'))
    else if (line.includes('RmShopFlowResponse') && field(line, 'type') === 'Buying') {
      const kiosk = field(line, 'kioskId')
      const req = shops.find((p) => !answered.has(p) && p.kiosk === kiosk && at - p.at <= FAIL_WINDOW_MS)
      if (!req) return
      answered.add(req)
      if (field(line, 'result') === 'Success') okShops.add(req)
    } else if (line.includes('Added notification "Awarded')) {
      const n = Number(line.match(/Awarded ([\d.,]+) aUEC/)?.[1]?.replace(/[.,]/g, ''))
      if (Number.isFinite(n) && n > 0) events.push({ kind: 'reward', key: `${at}|reward|${n}|${idx}`, at, amount: n })
    }
  })

  const placeAt = (at: number) => starts.find((s) => s.at >= at)?.place ?? [...starts].reverse().find((s) => s.at < at)?.place ?? null

  for (const p of commodity) {
    if (failed.has(p)) continue
    const resource = field(p.line, 'resourceGUID')
    if (!resource) continue
    const key = (total: number) => `${p.at}|${p.kind}|${total}|${p.idx}`
    if (p.kind === 'buy') {
      const total = num(p.line, 'price')
      const cscu = num(p.line, 'quantity')
      if (!total || !cscu) continue
      const scu = cscu / 100
      events.push({ kind: 'buy', key: key(total), at: p.at, amount: -total, resource, scu, pricePerScu: total / scu, place: placeAt(p.at) })
    } else {
      const total = num(p.line, 'amount')
      if (!total) continue
      const scu = boxScu(p.line) ?? 0
      events.push({ kind: 'sell', key: key(total), at: p.at, amount: total, resource, scu, pricePerScu: scu ? total / scu : 0, place: placeAt(p.at) })
    }
  }

  for (const p of shops) {
    if (!okShops.has(p)) continue
    const price = num(p.line, 'client_price')
    const item = field(p.line, 'itemName')
    if (!price || !item) continue
    events.push({ kind: 'shop', key: `${p.at}|shop|${price}|${p.idx}`, at: p.at, amount: -price, item })
  }

  events.sort((a, b) => a.at - b.at)
  const id = file.first ?? file.name
  const startedAt = file.first ? Date.parse(file.first) : (events[0]?.at ?? 0)
  const endedAt = file.last ? Date.parse(file.last) : (events[events.length - 1]?.at ?? startedAt)
  return { player, session: { id, startedAt, endedAt }, events }
}

export function mergeImport(prev: ImportData, parsed: ParsedLog[], now: number): ImportData {
  const byId = new Map(prev.sessions.map((s) => [s.id, s]))
  for (const p of parsed) {
    const old = byId.get(p.session.id)
    if (old && old.endedAt > p.session.endedAt) continue
    byId.set(p.session.id, { ...p.session, player: p.player, events: p.events })
  }
  const sessions = [...byId.values()].sort((a, b) => a.startedAt - b.startedAt)
  const player = [...sessions].reverse().find((s) => s.player)?.player ?? prev.player
  return { importedAt: now, player, sessions }
}

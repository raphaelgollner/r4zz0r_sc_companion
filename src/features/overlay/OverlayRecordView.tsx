import { useEffect, useMemo, useRef, useState } from 'react'
import type { Commodity, PriceRow, Terminal, Vehicle } from '../../data/types'
import { formatAuec, formatScu, parseAmount } from '../../domain/format'
import { activeOverlay, boxesLabel, clearOverlay, overlayBalance, overlayView, setOverlayBalance, type OverlayRow } from '../../domain/overlay'
import { sessionSummary } from '../../domain/progress'
import { useI18n } from '../../i18n/i18n'
import { useOverlay } from '../../store/overlay'
import { DataTable, Panel, SectionLabel } from '../../ui/components'
import { Dialog } from '../../ui/Dialog'
import { defaultImportDeps } from '../progress/importService'
import { SessionsPanel, SummaryPanel } from '../progress/ProgressParts'
import { formatDuration, signed, useDateFmt, useNow } from '../progress/progressFormat'

const NO_COMMODITIES: Commodity[] = []
const NO_TERMINALS: Terminal[] = []
const NO_PRICES: PriceRow[] = []
const NO_VEHICLES: Vehicle[] = []
const newId = () => (typeof globalThis.crypto?.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`)

export function OverlayRecordView({
  commodities = NO_COMMODITIES,
  terminals = NO_TERMINALS,
  prices = NO_PRICES,
  vehicles = NO_VEHICLES,
  resolveName = defaultImportDeps.resolveName,
}: {
  commodities?: Commodity[]
  terminals?: Terminal[]
  prices?: PriceRow[]
  vehicles?: Vehicle[]
  resolveName?: (guid: string) => Promise<string | null>
}) {
  const { t } = useI18n()
  const { data, ready, apply, start, end, lastRead, error } = useOverlay()
  const now = useNow(5_000)
  const dateFmt = useDateFmt()
  const [editingBalance, setEditingBalance] = useState(false)
  const [balanceText, setBalanceText] = useState('')
  const [filter, setFilter] = useState('all')
  const [starting, setStarting] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const asked = useRef(new Set<string>())

  const names = useMemo(() => new Map(Object.entries(data.names ?? {})), [data.names])
  const view = useMemo(() => overlayView(data, { names, commodities, terminals, prices, vehicles }, now, lastRead), [data, names, commodities, terminals, prices, vehicles, now, lastRead])

  useEffect(() => {
    const guids = new Set<string>()
    for (const s of data.sessions) for (const m of s.lines.join('\n').matchAll(/resourceGUID\[([^\]]+)\]/g)) guids.add(m[1])
    const missing = [...guids].filter((g) => !names.has(g) && !asked.current.has(g))
    for (const g of missing) {
      asked.current.add(g)
      void resolveName(g)
        .then((n) => n && apply((d) => ({ ...d, names: { ...d.names, [g]: n } })))
        .catch(() => {})
    }
  }, [data.sessions, names, resolveName, apply])

  if (!ready) return <p className="loading">{t('load.loading')}</p>

  const total = overlayBalance(data, view)
  const session = activeOverlay(data)
  const progressSession = view.data.sessions.find((s) => s.id === session?.id) ?? null
  const summary = progressSession ? sessionSummary(progressSession, view.data.txs, now) : null
  const sessions = [...view.data.sessions].sort((a, b) => b.startedAt - a.startedAt)
  const summarySession = view.data.sessions.find((s) => s.id === filter) ?? progressSession
  const rows = view.rows.filter((r) => filter === 'all' || r.sessionId === filter)
  const opLabel = (r: OverlayRow) => (r.op === 'shop' ? r.description || t('overlay.op.shop') : t(`overlay.op.${r.op}`))

  return (
    <div className="progress-page">
      <div className="progress-top">
        <Panel glow>
          <SectionLabel>{t('overlay.balance')}</SectionLabel>
          <div className="big-number" data-testid="overlay-balance">
            {formatAuec(total)} <span className="unit">aUEC</span>
          </div>
          <p className="muted">{t('overlay.balanceHint')}</p>
          {editingBalance ? (
            <div className="row" style={{ marginTop: 10 }}>
              <label className="field">
                {t('progress.newBalance')}
                <input className="input num" inputMode="numeric" value={balanceText} onChange={(e) => setBalanceText(e.target.value)} autoFocus />
              </label>
              <button
                className="btn primary"
                disabled={!Number.isFinite(parseAmount(balanceText))}
                onClick={() => {
                  apply((d) => setOverlayBalance(d, parseAmount(balanceText), Date.now(), newId()))
                  setEditingBalance(false)
                }}
              >
                {t('progress.confirm')}
              </button>
              <button className="btn-link" onClick={() => setEditingBalance(false)}>
                {t('common.cancel')}
              </button>
            </div>
          ) : (
            <button
              className="btn"
              style={{ marginTop: 10 }}
              onClick={() => {
                setBalanceText('')
                setEditingBalance(true)
              }}
            >
              {t('progress.setBalance')}
            </button>
          )}
        </Panel>

        <Panel>
          <SectionLabel>{t('progress.session')}</SectionLabel>
          {session && summary ? (
            <div className="stack" style={{ gap: 6 }}>
              <p className="session-live">
                ● {t('overlay.live')} · {formatDuration(summary.durationMs)}
              </p>
              <p className="muted" aria-live="polite">
                {lastRead ? t('overlay.lastRead', { s: Math.max(0, Math.round((now - lastRead) / 1000)) }) : t('overlay.reading')}
              </p>
              <div className="session-stats">
                <span>
                  {t('progress.income')} <b className="profit num">{formatAuec(summary.income)}</b>
                </span>
                <span>
                  {t('progress.expense')} <b className="loss num">{formatAuec(summary.expense)}</b>
                </span>
                <span>
                  {t('progress.net')} <b className={`num ${summary.net >= 0 ? 'profit' : 'loss'}`}>{signed(summary.net)}</b>
                </span>
              </div>
              <p className="muted">{t('overlay.delayNote')}</p>
              <div>
                <button className="btn" onClick={() => void end()}>
                  {t('progress.end')}
                </button>
              </div>
            </div>
          ) : (
            <div className="stack" style={{ gap: 8, alignItems: 'flex-start' }}>
              <p className="muted">{t('overlay.noSession')}</p>
              <button
                className="btn primary"
                disabled={starting}
                onClick={() => {
                  setStarting(true)
                  void start().finally(() => setStarting(false))
                }}
              >
                {t('progress.start')}
              </button>
            </div>
          )}
          {error && (
            <p className="load-error" role="alert">
              {t(error === 'noDir' ? 'overlay.noDir' : 'overlay.readFailed')}
            </p>
          )}
        </Panel>
        <SessionsPanel sessions={sessions} txs={view.data.txs} now={now} selected={filter} onSelect={setFilter} />
      </div>

      {summarySession && <SummaryPanel session={summarySession} txs={view.data.txs} />}

      <Panel>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
          <SectionLabel>{t('progress.txs')}</SectionLabel>
          <label className="field">
            <select className="select" aria-label={t('progress.filter')} value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">{t('progress.filterAll')}</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {t('progress.filterOne', { date: dateFmt(s.startedAt) })}
                </option>
              ))}
            </select>
          </label>
        </div>
        <DataTable<OverlayRow>
          rows={rows}
          rowKey={(r) => r.id}
          empty={t('overlay.noRows')}
          columns={[
            { key: 'at', header: t('progress.colDate'), render: (r) => dateFmt(r.at) },
            { key: 'op', header: t('overlay.col.op'), render: (r) => <span className={`chip op-${r.op}`}>{opLabel(r)}</span> },
            { key: 'res', header: t('progress.resource'), render: (r) => r.commodityName ?? '—' },
            {
              key: 'qty',
              header: t('overlay.col.qty'),
              render: (r) =>
                r.scu ? (
                  <>
                    <span className="num">{formatScu(r.scu)}</span>
                    {r.boxes?.length ? <div className="muted small">{boxesLabel(r.boxes)}</div> : null}
                  </>
                ) : (
                  '—'
                ),
            },
            { key: 'place', header: t('progress.place'), render: (r) => r.place ?? '—' },
            { key: 'price', header: t('overlay.col.price'), align: 'right', render: (r) => (r.pricePerScu ? <span className="num">{formatAuec(Math.round(r.pricePerScu))}</span> : '—') },
            { key: 'val', header: t('progress.value'), align: 'right', render: (r) => <span className={r.amount >= 0 ? 'profit' : 'loss'}>{signed(r.amount)}</span> },
            { key: 'auto', header: t('overlay.col.auto'), render: (r) => (r.autoLoad === undefined ? '—' : r.autoLoad ? t('overlay.yes') : t('overlay.no')) },
            { key: 'ship', header: t('overlay.col.ship'), render: (r) => r.ship ?? '—' },
          ]}
        />
      </Panel>

      <div>
        <button className="btn danger" disabled={!!session} onClick={() => setConfirmClear(true)}>
          {t('progress.clearAll')}
        </button>
      </div>

      {confirmClear && (
        <Dialog title={t('overlay.clearConfirm')} onClose={() => setConfirmClear(false)}>
          <p>{t('overlay.clearWarn')}</p>
          <div className="row">
            <button
              className="btn primary"
              onClick={() => {
                apply((d) => clearOverlay(d))
                setFilter('all')
                setConfirmClear(false)
              }}
            >
              {t('progress.clearDo')}
            </button>
            <button className="btn-link" onClick={() => setConfirmClear(false)}>
              {t('common.cancel')}
            </button>
          </div>
        </Dialog>
      )}
    </div>
  )
}

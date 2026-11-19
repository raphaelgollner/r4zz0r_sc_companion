import { useEffect, useMemo, useState } from 'react'
import {
  activeSession,
  addTx,
  balance,
  clearProgress,
  commoditySummary,
  endSession,
  placesVisited,
  removeTx,
  sessionSummary,
  setBalance,
  startSession,
  TX_CATEGORIES,
  updateTx,
  type Session,
  type Tx,
  type TxCategory,
} from '../../domain/progress'
import type { Commodity, Terminal } from '../../data/types'
import { formatAuec, formatScu, parseAmount } from '../../domain/format'
import { locationPath } from '../../domain/location'
import { useI18n } from '../../i18n/i18n'
import { useProgress } from '../../store/progress'
import { DataTable, Panel, SectionLabel } from '../../ui/components'
import { Dialog } from '../../ui/Dialog'
import { SearchPicker } from '../../ui/SearchPicker'

const newId = () => (typeof globalThis.crypto?.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`)

function toLocalInput(ms: number): string {
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatDuration(ms: number): string {
  const min = Math.max(0, Math.floor(ms / 60_000))
  return `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`
}

/** Atualiza o "agora" a cada 30 s para a duração da sessão andar sozinha. */
function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${formatAuec(Math.abs(n))}`

interface FormState {
  editingId: string | null
  kind: 'in' | 'out'
  value: string
  category: TxCategory
  description: string
  at: string
  commodity: { id: number; name: string } | null
  terminal: { id: number; name: string } | null
  scu: string
  price: string
}

/** `at` vazio = "agora": a data é pega na hora de salvar. */
const emptyForm = (): FormState => ({
  editingId: null, kind: 'in', value: '', category: 'trade', description: '', at: '', commodity: null, terminal: null, scu: '', price: '',
})

const positive = (text: string) => {
  const n = parseAmount(text)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** INÍCIO: saldo, sessão e transações. Sem `commodities`/`terminals` (UEX não carregou), os campos de busca ficam desabilitados. */
export function ProgressView({ commodities, terminals }: { commodities?: Commodity[]; terminals?: Terminal[] } = {}) {
  const { t, lang } = useI18n()
  const { data, ready, loadFailed, apply } = useProgress()
  const now = useNow()
  const [confirmClear, setConfirmClear] = useState(false)
  const [editingBalance, setEditingBalance] = useState(false)
  const [balanceText, setBalanceText] = useState('')
  const [form, setForm] = useState<FormState>(emptyForm)
  const [toDelete, setToDelete] = useState<Tx | null>(null)
  const [filter, setFilter] = useState<string>('all')

  const total = balance(data.txs)
  const session = activeSession(data)
  const summary = session ? sessionSummary(session, data.txs, now) : null
  const formValue = parseAmount(form.value)
  const canSave = Number.isFinite(formValue) && formValue > 0
  const dateFmt = (ms: number) => new Date(ms).toLocaleString(lang === 'en' ? 'en-US' : 'pt-BR', { dateStyle: 'short', timeStyle: 'short' })
  const sessionsById = useMemo(() => new Map(data.sessions.map((s) => [s.id, s])), [data.sessions])

  const txs = useMemo(() => {
    const list = data.txs.filter((x) =>
      filter === 'all' ? true : filter === 'none' ? x.sessionId === null : filter === 'active' ? !!session && x.sessionId === session.id : x.sessionId === filter,
    )
    return [...list].sort((a, b) => b.at - a.at)
  }, [data.txs, filter, session])

  const sessions = useMemo(() => [...data.sessions].sort((a, b) => b.startedAt - a.startedAt), [data.sessions])

  if (!ready) return <p className="loading">{t('load.loading')}</p>
  if (loadFailed)
    return (
      <div className="load-error" role="alert">
        {t('progress.loadFailed')}
      </div>
    )

  const save = () => {
    if (!canSave) return
    const amount = form.kind === 'in' ? formValue : -formValue
    const at = (form.at && new Date(form.at).getTime()) || Date.now()
    const fields = {
      amount,
      category: form.category,
      description: form.description.trim(),
      at,
      commodityId: form.commodity?.id,
      commodityName: form.commodity?.name,
      terminalId: form.terminal?.id,
      terminalName: form.terminal?.name,
      scu: positive(form.scu) ?? undefined,
      pricePerScu: positive(form.price) ?? undefined,
    }
    if (form.editingId) apply((d) => updateTx(d, form.editingId!, fields))
    else apply((d) => addTx(d, fields, newId()))
    setForm(emptyForm())
  }

  const edit = (x: Tx) =>
    setForm({
      editingId: x.id,
      kind: x.amount >= 0 ? 'in' : 'out',
      value: formatAuec(Math.abs(x.amount)),
      category: x.category,
      description: x.description,
      at: toLocalInput(x.at),
      commodity: x.commodityId !== undefined ? { id: x.commodityId, name: x.commodityName ?? '?' } : null,
      terminal: x.terminalId !== undefined ? { id: x.terminalId, name: x.terminalName ?? '?' } : null,
      scu: x.scu ? formatAuec(x.scu) : '',
      price: x.pricePerScu ? formatAuec(x.pricePerScu) : '',
    })

  /** SCU ou preço mudou: com os dois válidos, o valor vira SCU × preço (o usuário ainda pode editar o valor). */
  const setQty = (patch: Partial<Pick<FormState, 'scu' | 'price'>>) => {
    const next = { ...form, ...patch }
    const scu = positive(next.scu)
    const price = positive(next.price)
    setForm(scu && price ? { ...next, value: formatAuec(Math.round(scu * price)) } : next)
  }

  const describe = (x: Tx) => (x.kind === 'adjust' ? t('progress.adjust') : x.description || t(`cat.${x.category}`))
  const summarySession = sessionsById.get(filter) ?? session
  const summaryTxs = summarySession ? data.txs.filter((x) => x.sessionId === summarySession.id) : []
  const byCommodity = commoditySummary(summaryTxs)
  const places = placesVisited(summaryTxs)

  return (
    <div className="progress-page">
      <div className="progress-top">
        <Panel glow>
          <SectionLabel>{t('progress.balance')}</SectionLabel>
          <div className="big-number" data-testid="balance">
            {formatAuec(total)} <span className="unit">aUEC</span>
          </div>
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
                  apply((d) => setBalance(d, parseAmount(balanceText), Date.now(), newId()))
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
                ● {t('progress.active')} · {formatDuration(summary.durationMs)}
              </p>
              <div className="session-stats">
                <span>
                  {t('progress.income')} <b className="profit num">{formatAuec(summary.income)}</b>
                </span>
                <span>
                  {t('progress.expense')} <b className="loss num">{formatAuec(summary.expense)}</b>
                </span>
                <span>
                  {t('progress.net')}{' '}
                  <b className={`num ${summary.net >= 0 ? 'profit' : 'loss'}`} data-testid="session-net">
                    {signed(summary.net)}
                  </b>
                </span>
              </div>
              <div>
                <button
                  className="btn"
                  onClick={() => {
                    apply((d) => endSession(d, Date.now()))
                    if (filter === 'active') setFilter('all')
                  }}
                >
                  {t('progress.end')}
                </button>
              </div>
            </div>
          ) : (
            <div className="stack" style={{ gap: 8, alignItems: 'flex-start' }}>
              <p className="muted">{t('progress.noSession')}</p>
              <button className="btn primary" onClick={() => apply((d) => startSession(d, Date.now(), newId()))}>
                {t('progress.start')}
              </button>
            </div>
          )}
        </Panel>
      </div>

      <div className="grid-2 progress-grid">
        <Panel>
          <SectionLabel>{form.editingId ? t('progress.editTx') : t('progress.newTx')}</SectionLabel>
          <div className="stack" style={{ gap: 10 }}>
            <div className="row">
              <label className="field">
                {t('progress.type')}
                <select className="select" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as 'in' | 'out' })}>
                  <option value="in">{t('progress.in')}</option>
                  <option value="out">{t('progress.out')}</option>
                </select>
              </label>
              <label className="field">
                {t('progress.value')}
                <input className="input num" inputMode="numeric" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
              </label>
              <label className="field">
                {t('progress.category')}
                <select className="select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as TxCategory })}>
                  {TX_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {t(`cat.${c}`)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="row">
              <div className="field">
                <span>{t('progress.resource')}</span>
                <div className="pick-clear">
                  <SearchPicker
                    items={commodities ?? []}
                    label={(c) => c.name}
                    text={(c) => `${c.name} ${c.code}`}
                    value={null}
                    onPick={(c) => setForm({ ...form, commodity: { id: c.id, name: c.name } })}
                    ariaLabel={t('progress.resource')}
                    placeholder={form.commodity?.name ?? t('progress.pick')}
                    disabled={!commodities}
                  />
                  {form.commodity && (
                    <button className="btn-link" aria-label={t('progress.clearOf', { name: form.commodity.name })} onClick={() => setForm({ ...form, commodity: null })}>
                      ×
                    </button>
                  )}
                </div>
              </div>
              <div className="field">
                <span>{t('progress.place')}</span>
                <div className="pick-clear">
                  <SearchPicker
                    items={terminals ?? []}
                    label={(x) => x.displayname}
                    text={(x) => `${x.displayname} ${locationPath(x).join(' ')}`}
                    sub={(x) => locationPath(x).join(' › ')}
                    value={null}
                    onPick={(x) => setForm({ ...form, terminal: { id: x.id, name: x.displayname } })}
                    ariaLabel={t('progress.place')}
                    placeholder={form.terminal?.name ?? t('progress.pick')}
                    disabled={!terminals}
                  />
                  {form.terminal && (
                    <button className="btn-link" aria-label={t('progress.clearOf', { name: form.terminal.name })} onClick={() => setForm({ ...form, terminal: null })}>
                      ×
                    </button>
                  )}
                </div>
              </div>
              <label className="field">
                SCU
                <input className="input num" inputMode="numeric" style={{ width: 100 }} value={form.scu} onChange={(e) => setQty({ scu: e.target.value })} />
              </label>
              <label className="field">
                {t('progress.pricePerScu')}
                <input className="input num" inputMode="numeric" style={{ width: 120 }} value={form.price} onChange={(e) => setQty({ price: e.target.value })} />
              </label>
            </div>
            <div className="row">
              <label className="field" style={{ flex: 1 }}>
                {t('progress.description')}
                <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </label>
              <label className="field">
                {t('progress.date')}
                <input className="input" type="datetime-local" value={form.at || toLocalInput(now)} onChange={(e) => setForm({ ...form, at: e.target.value })} />
              </label>
            </div>
            <div className="row">
              <button className="btn primary" disabled={!canSave} onClick={save}>
                {t('progress.save')}
              </button>
              {form.editingId && (
                <button className="btn-link" onClick={() => setForm(emptyForm())}>
                  {t('common.cancel')}
                </button>
              )}
              {session && !form.editingId && <span className="muted">{t('progress.linkedToSession')}</span>}
            </div>
          </div>
        </Panel>

        <div role="region" aria-label={t('progress.sessions')}>
          <Panel>
            <SectionLabel>{t('progress.sessions')}</SectionLabel>
            <DataTable<Session>
              rows={sessions}
              rowKey={(s) => s.id}
              empty={t('progress.noSessions')}
              selectedKey={filter}
              onRowClick={(s) => setFilter(s.id)}
              columns={[
                { key: 'd', header: t('progress.colDate'), render: (s) => dateFmt(s.startedAt) },
                { key: 'dur', header: t('progress.duration'), render: (s) => (s.endedAt ? formatDuration(s.endedAt - s.startedAt) : `● ${formatDuration(now - s.startedAt)}`) },
                { key: 'in', header: t('progress.income'), align: 'right', render: (s) => formatAuec(sessionSummary(s, data.txs, now).income) },
                { key: 'out', header: t('progress.expense'), align: 'right', render: (s) => formatAuec(sessionSummary(s, data.txs, now).expense) },
                {
                  key: 'net',
                  header: t('progress.net'),
                  align: 'right',
                  render: (s) => {
                    const net = sessionSummary(s, data.txs, now).net
                    return <span className={net >= 0 ? 'profit' : 'loss'}>{signed(net)}</span>
                  },
                },
              ]}
            />
          </Panel>
        </div>
      </div>

      {summarySession && (
        <div role="region" aria-label={t('progress.summary')}>
          <Panel>
            <SectionLabel>
              {t('progress.summary')} · {dateFmt(summarySession.startedAt)}
            </SectionLabel>
            {byCommodity.length === 0 && places.length === 0 ? (
              <p className="muted">{t('progress.summaryEmpty')}</p>
            ) : (
              <div className="grid-2">
                <DataTable
                  rows={byCommodity}
                  rowKey={(c) => c.commodityId}
                  empty={t('progress.summaryEmpty')}
                  columns={[
                    { key: 'n', header: t('progress.resource'), render: (c) => c.name },
                    { key: 'b', header: t('progress.bought'), align: 'right', render: (c) => formatScu(c.boughtScu) },
                    { key: 's', header: t('progress.sold'), align: 'right', render: (c) => formatScu(c.soldScu) },
                    { key: 'net', header: t('progress.net'), align: 'right', render: (c) => <span className={c.net >= 0 ? 'profit' : 'loss'}>{signed(c.net)}</span> },
                  ]}
                />
                <DataTable
                  rows={places}
                  rowKey={(p) => p.terminalId}
                  empty={t('progress.summaryEmpty')}
                  columns={[
                    { key: 'p', header: t('progress.visited'), render: (p) => p.name },
                    {
                      key: 'a',
                      header: t('progress.didThere'),
                      render: (p) =>
                        p.actions.length ? p.actions.map((a) => t(a.kind === 'buy' ? 'progress.boughtX' : 'progress.soldX', { name: a.commodity })).join(' · ') : '—',
                    },
                  ]}
                />
              </div>
            )}
          </Panel>
        </div>
      )}

      <Panel>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
          <SectionLabel>{t('progress.txs')}</SectionLabel>
          <label className="field">
            <select className="select" aria-label={t('progress.filter')} value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">{t('progress.filterAll')}</option>
              {session && <option value="active">{t('progress.filterSession')}</option>}
              <option value="none">{t('progress.filterNone')}</option>
              {sessionsById.has(filter) && <option value={filter}>{t('progress.filterOne', { date: dateFmt(sessionsById.get(filter)!.startedAt) })}</option>}
            </select>
          </label>
        </div>
        <DataTable<Tx>
          rows={txs}
          rowKey={(x) => x.id}
          empty={t('progress.noTxs')}
          columns={[
            { key: 'at', header: t('progress.colDate'), render: (x) => dateFmt(x.at) },
            { key: 'desc', header: t('progress.description'), render: (x) => describe(x) },
            {
              key: 'res',
              header: t('progress.resource'),
              render: (x) => (x.commodityName ? (x.scu ? `${x.commodityName} · ${formatScu(x.scu)}` : x.commodityName) : '—'),
            },
            { key: 'place', header: t('progress.place'), render: (x) => x.terminalName ?? '—' },
            { key: 'cat', header: t('progress.category'), render: (x) => (x.kind === 'adjust' ? '—' : <span className="chip">{t(`cat.${x.category}`)}</span>) },
            { key: 'val', header: t('progress.value'), align: 'right', render: (x) => <span className={x.amount >= 0 ? 'profit' : 'loss'}>{signed(x.amount)}</span> },
            {
              key: 'act',
              header: '',
              render: (x) => (
                <span className="row-actions">
                  {x.kind === 'normal' && (
                    <button className="btn-link" onClick={() => edit(x)} aria-label={t('progress.editOf', { desc: describe(x) })}>
                      {t('progress.edit')}
                    </button>
                  )}
                  <button className="btn-link danger" onClick={() => setToDelete(x)} aria-label={t('progress.deleteOf', { desc: describe(x) })}>
                    {t('progress.delete')}
                  </button>
                </span>
              ),
            },
          ]}
        />
      </Panel>

      <div>
        <button className="btn danger" onClick={() => setConfirmClear(true)}>
          {t('progress.clearAll')}
        </button>
      </div>

      {confirmClear && (
        <Dialog title={t('progress.clearConfirm')} onClose={() => setConfirmClear(false)}>
          <p>{t('progress.clearWarn')}</p>
          <div className="row">
            <button
              className="btn primary"
              onClick={() => {
                apply(() => clearProgress())
                setFilter('all')
                setForm(emptyForm())
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

      {toDelete && (
        <Dialog title={t('progress.deleteConfirm')} onClose={() => setToDelete(null)}>
          <p>
            {describe(toDelete)} · <b className={toDelete.amount >= 0 ? 'profit' : 'loss'}>{signed(toDelete.amount)} aUEC</b>
          </p>
          <p className="muted">{t('progress.deleteHint')}</p>
          <div className="row">
            <button
              className="btn primary"
              onClick={() => {
                apply((d) => removeTx(d, toDelete.id))
                setToDelete(null)
              }}
            >
              {t('progress.delete')}
            </button>
            <button className="btn-link" onClick={() => setToDelete(null)}>
              {t('common.cancel')}
            </button>
          </div>
        </Dialog>
      )}
    </div>
  )
}

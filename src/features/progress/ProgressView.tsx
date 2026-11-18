import { useEffect, useMemo, useState } from 'react'
import {
  activeSession,
  addTx,
  balance,
  endSession,
  removeTx,
  sessionSummary,
  setBalance,
  setProfile,
  startSession,
  TX_CATEGORIES,
  updateTx,
  type Session,
  type Tx,
  type TxCategory,
} from '../../domain/progress'
import { formatAuec, parseAmount } from '../../domain/format'
import { useI18n } from '../../i18n/i18n'
import { useProgress } from '../../store/progress'
import { DataTable, Panel, SectionLabel } from '../../ui/components'
import { Dialog } from '../../ui/Dialog'
import { resizePhoto } from './photo'

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
}

/** `at` vazio = "agora": a data é pega na hora de salvar. */
const emptyForm = (): FormState => ({ editingId: null, kind: 'in', value: '', category: 'trade', description: '', at: '' })

export function ProgressView() {
  const { t, lang } = useI18n()
  const { data, ready, loadFailed, apply } = useProgress()
  const now = useNow()
  const [photoError, setPhotoError] = useState(false)
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

  const onPhoto = async (file: File | undefined) => {
    if (!file) return
    try {
      const photo = await resizePhoto(file)
      setPhotoError(false)
      apply((d) => setProfile(d, { photo }))
    } catch {
      setPhotoError(true)
    }
  }

  const save = () => {
    if (!canSave) return
    const amount = form.kind === 'in' ? formValue : -formValue
    const at = (form.at && new Date(form.at).getTime()) || Date.now()
    const fields = { amount, category: form.category, description: form.description.trim(), at }
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
    })

  const describe = (x: Tx) => (x.kind === 'adjust' ? t('progress.adjust') : x.description || t(`cat.${x.category}`))
  const initials = (data.profile.name || 'T').slice(0, 2).toUpperCase()

  return (
    <div className="progress-page">
      <div className="progress-top">
        <Panel>
          <SectionLabel>{t('progress.profile')}</SectionLabel>
          <div className="profile">
            <div className="avatar">{data.profile.photo ? <img src={data.profile.photo} alt={data.profile.name || 'avatar'} /> : <span>{initials}</span>}</div>
            <div className="stack" style={{ gap: 8 }}>
              <label className="field">
                {t('progress.name')}
                <input
                  className="input"
                  value={data.profile.name}
                  placeholder={t('progress.namePlaceholder')}
                  onChange={(e) => apply((d) => setProfile(d, { name: e.target.value }))}
                />
              </label>
              <div className="row" style={{ gap: 8 }}>
                <label className="btn file-btn">
                  {t('progress.changePhoto')}
                  <input
                    type="file"
                    accept="image/*"
                    aria-label={t('progress.changePhoto')}
                    onChange={(e) => {
                      onPhoto(e.target.files?.[0])
                      e.target.value = ''
                    }}
                  />
                </label>
                {data.profile.photo && (
                  <button className="btn-link" onClick={() => apply((d) => setProfile(d, { photo: null }))}>
                    {t('progress.removePhoto')}
                  </button>
                )}
              </div>
              {photoError && <p className="warn-text">{t('progress.photoError')}</p>}
            </div>
          </div>
        </Panel>

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

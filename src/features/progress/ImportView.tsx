import { useEffect, useMemo, useRef, useState } from 'react'
import type { Commodity, PriceRow, Terminal } from '../../data/types'
import { mergeImport, parseGameLog } from '../../domain/gamelog'
import { importToProgress } from '../../domain/importProgress'
import type { Tx } from '../../domain/progress'
import { useI18n } from '../../i18n/i18n'
import { Panel, SectionLabel } from '../../ui/components'
import { Dialog } from '../../ui/Dialog'
import { DEFAULT_GAME_DIR, defaultImportDeps, EMPTY_SAVED, type ImportDeps, type SavedImport } from './importService'
import { SessionsPanel, SummaryPanel, TxTable } from './ProgressParts'
import { signed, useDateFmt, useNow } from './progressFormat'

const NO_COMMODITIES: Commodity[] = []
const NO_TERMINALS: Terminal[] = []
const NO_PRICES: PriceRow[] = []
const NAME_BATCH = 4
const failedNames = new Set<string>()

export function ImportView({
  commodities = NO_COMMODITIES,
  terminals = NO_TERMINALS,
  prices = NO_PRICES,
  deps = defaultImportDeps,
}: {
  commodities?: Commodity[]
  terminals?: Terminal[]
  prices?: PriceRow[]
  deps?: ImportDeps
}) {
  const { t } = useI18n()
  const now = useNow()
  const dateFmt = useDateFmt()
  const [saved, setSavedState] = useState<SavedImport>(EMPTY_SAVED)
  const savedRef = useRef(saved)
  const mounted = useRef(true)
  const setSaved = (v: SavedImport) => {
    savedRef.current = v
    if (mounted.current) setSavedState(v)
  }
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    mounted.current = true
    deps
      .load()
      .then((v) => {
        if (v && mounted.current && savedRef.current === EMPTY_SAVED) setSaved({ ...EMPTY_SAVED, ...v })
      })
      .catch(() => {})
      .finally(() => mounted.current && setReady(true))
    return () => {
      mounted.current = false
    }
  }, [deps])

  const data = useMemo(
    () => importToProgress(saved.data, { names: new Map(Object.entries(saved.names)), commodities, terminals, prices }),
    [saved, commodities, terminals, prices],
  )

  const resolveNames = async () => {
    const pending = new Set<string>()
    for (const s of savedRef.current.data.sessions)
      for (const e of s.events) if ('resource' in e && !savedRef.current.names[e.resource] && !failedNames.has(e.resource)) pending.add(e.resource)
    const list = [...pending]
    for (let i = 0; i < list.length; i += NAME_BATCH) {
      const batch = list.slice(i, i + NAME_BATCH)
      const found = await Promise.allSettled(batch.map((g) => deps.resolveName(g)))
      const names = { ...savedRef.current.names }
      found.forEach((r, k) => {
        if (r.status === 'fulfilled' && r.value) names[batch[k]] = r.value
        else failedNames.add(batch[k])
      })
      const next = { ...savedRef.current, names }
      setSaved(next)
      await deps.save(next).catch(() => {})
    }
  }

  const run = async (dir: string) => {
    setBusy(true)
    setError(null)
    try {
      const current = savedRef.current
      const skip = current.dir === dir ? current.files : []
      const files = await deps.read(dir, skip)
      const merged = mergeImport(current.data, files.map(parseGameLog), Date.now())
      const read = files.map((f) => f.name).filter((n) => n !== 'Game.log')
      const next = { ...current, data: merged, dir, files: [...new Set([...skip, ...read])] }
      setSaved(next)
      await deps.save(next).catch(() => {})
    } catch {
      if (mounted.current) setError(t('import.readError'))
      return
    } finally {
      if (mounted.current) setBusy(false)
    }
    void resolveNames()
  }

  const choose = async () => {
    const start = savedRef.current.dir ?? (await deps.findDir().catch(() => null)) ?? DEFAULT_GAME_DIR
    const dir = await deps.pickDir(start).catch(() => null)
    if (dir) await run(dir)
  }

  const clear = async () => {
    setConfirmClear(false)
    setSaved(EMPTY_SAVED)
    setFilter('all')
    await deps.remove().catch(() => {})
  }

  if (!ready) return <p className="loading">{t('load.loading')}</p>

  const sessions = [...data.sessions].sort((a, b) => b.startedAt - a.startedAt)
  const describe = (x: Tx) => (x.description === 'contract' ? t('import.contract') : x.description || t(`cat.${x.category}`))
  const selected = data.sessions.find((s) => s.id === filter) ?? null
  const txs = data.txs.filter((x) => filter === 'all' || x.sessionId === filter).sort((a, b) => b.at - a.at)
  const total = txs.reduce((sum, x) => sum + x.amount, 0)

  if (data.sessions.length === 0)
    return (
      <div className="import-empty">
        <Panel glow>
          <h2 className="import-question">{t('import.question')}</h2>
          <p>{t('import.what')}</p>
          <ul className="import-list">
            <li>
              <b>{t('import.inLabel')}</b> {t('import.in')}
            </li>
            <li>
              <b>{t('import.outLabel')}</b> {t('import.out')}
            </li>
          </ul>
          <p className="warn-text">{t('import.approx')}</p>
          <p className="muted">{t('import.readOnly')}</p>
          {error && (
            <p className="load-error" role="alert">
              {error}
            </p>
          )}
          <button className="btn primary" disabled={busy} onClick={() => void choose()}>
            {busy ? t('import.importing') : t('import.import')}
          </button>
        </Panel>
      </div>
    )

  return (
    <div className="progress-page">
      <div className="progress-top">
        <Panel glow>
          <SectionLabel>{t('import.title')}</SectionLabel>
          {data.profile.name && <p className="import-player">{data.profile.name}</p>}
          <p className="muted">
            {t('import.lastImport', { date: saved.data.importedAt ? dateFmt(saved.data.importedAt) : '—' })}
            {saved.dir && <> · {saved.dir}</>}
          </p>
          <p>
            {t(filter === 'all' ? 'import.resultAll' : 'import.resultSession')}{' '}
            <b className={total >= 0 ? 'profit' : 'loss'}>{signed(total)} aUEC</b>
          </p>
          <p className="warn-text">{t('import.approxShort')}</p>
          {error && (
            <p className="load-error" role="alert">
              {error}
            </p>
          )}
          <div className="row">
            <button className="btn primary" disabled={busy || !saved.dir} onClick={() => saved.dir && void run(saved.dir)}>
              {busy ? t('import.importing') : t('import.refresh')}
            </button>
            <button className="btn" disabled={busy} onClick={() => void choose()}>
              {t('import.changeDir')}
            </button>
            <button className="btn danger" disabled={busy} onClick={() => setConfirmClear(true)}>
              {t('import.clear')}
            </button>
          </div>
        </Panel>
        <SessionsPanel sessions={sessions} txs={data.txs} now={now} selected={filter} onSelect={setFilter} />
      </div>

      {selected && <SummaryPanel session={selected} txs={data.txs} />}

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
        <TxTable txs={txs} describe={describe} />
      </Panel>

      {confirmClear && (
        <Dialog title={t('import.clearConfirm')} onClose={() => setConfirmClear(false)}>
          <p>{t('import.clearWarn')}</p>
          <div className="row">
            <button className="btn primary" onClick={() => void clear()}>
              {t('import.clearDo')}
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

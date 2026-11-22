import { useMemo, useState, type ReactNode } from 'react'
import type { StatusLevel } from '../data/types'
import { ageLevel, formatAge } from '../domain/freshness'
import { useI18n } from '../i18n/i18n'
import { usePrefs } from '../store/prefs'
import { Tooltip } from './Tooltip'

export function Panel({ title, children, glow }: { title?: ReactNode; children: ReactNode; glow?: boolean }) {
  return (
    <section className={`panel${glow ? ' glow' : ''}`}>
      {title && <h2>{title}</h2>}
      {children}
    </section>
  )
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="section-label">// {children}</p>
}

export interface TabItem<K extends string> {
  key: K
  label: string
  disabled?: boolean
  hint?: string
}

export function Tabs<K extends string>({
  items,
  active,
  onChange,
  sub,
}: {
  items: TabItem<K>[]
  active: K
  onChange: (k: K) => void
  sub?: boolean
}) {
  return (
    <nav className={`tabs${sub ? ' sub' : ''}`} role="tablist">
      {items.map((it) => (
        <button
          key={it.key}
          role="tab"
          className="tab"
          aria-selected={it.key === active}
          disabled={it.disabled}
          title={it.hint}
          onClick={() => onChange(it.key)}
        >
          {it.label}
          {it.disabled && it.hint && <span className="hint">{it.hint}</span>}
        </button>
      ))}
    </nav>
  )
}

export interface Column<R> {
  key: string
  header: string
  render: (r: R) => ReactNode
  sortValue?: (r: R) => number | string
  align?: 'left' | 'right'
}

export function DataTable<R>({
  rows,
  columns,
  rowKey,
  initialSort,
  onRowClick,
  selectedKey,
  empty,
}: {
  rows: R[]
  columns: Column<R>[]
  rowKey: (r: R) => string | number
  initialSort?: { key: string; dir: 'asc' | 'desc' }
  onRowClick?: (r: R) => void
  selectedKey?: string | number | null
  empty?: string
}) {
  const { t } = useI18n()
  const [sort, setSort] = useState(initialSort)

  const sorted = useMemo(() => {
    const col = sort && columns.find((c) => c.key === sort.key)
    if (!col?.sortValue) return rows
    const sv = col.sortValue
    const dir = sort!.dir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const x = sv(a)
      const y = sv(b)
      return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'pt-BR')) * dir
    })
  }, [rows, columns, sort])

  const toggle = (c: Column<R>) => {
    if (!c.sortValue) return
    setSort((s) => (s?.key === c.key ? { key: c.key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key: c.key, dir: 'asc' }))
  }

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className={`${c.sortValue ? 'sortable' : ''} ${c.align === 'right' ? 'right' : ''}`}
                aria-sort={sort?.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                onClick={() => toggle(c)}
              >
                {c.header}
                {sort?.key === c.key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => {
            const k = rowKey(r)
            return (
              <tr
                key={k}
                className={onRowClick ? 'clickable' : undefined}
                aria-selected={selectedKey === k || undefined}
                onClick={onRowClick ? () => onRowClick(r) : undefined}
              >
                {columns.map((c) => (
                  <td key={c.key} className={c.align === 'right' ? 'right num' : undefined}>
                    {c.render(r)}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
      {sorted.length === 0 && <div className="empty">{empty ?? t('common.none')}</div>}
    </div>
  )
}

export function FreshnessBadge({
  dateModifiedSec,
  now,
  warnHours,
  staleDays,
}: {
  dateModifiedSec: number | null | undefined
  now: number
  warnHours?: number
  staleDays?: number
}) {
  const { lang } = useI18n()
  const [prefs] = usePrefs()
  const level = ageLevel(dateModifiedSec, now, warnHours ?? prefs.warnHours, staleDays ?? prefs.staleDays)
  const exact = dateModifiedSec && dateModifiedSec > 0 ? new Date(dateModifiedSec * 1000).toLocaleString(lang === 'en' ? 'en-US' : 'pt-BR') : null
  return (
    <Tooltip content={exact}>
      <span className={`age-${level}`}>{formatAge(dateModifiedSec, now, lang)}</span>
    </Tooltip>
  )
}

export function StatusBadge({ code, levels }: { code: number; levels: StatusLevel[] }) {
  const lvl = levels.find((l) => l.code === code)
  if (!lvl) return <span className="muted">—</span>
  return (
    <Tooltip content={lvl.percentage ? `${lvl.name} (${lvl.percentage})` : lvl.name}>
      <span className={`badge status-${lvl.colors}`}>{lvl.name_short}</span>
    </Tooltip>
  )
}

export function errorKind(code: string): 'offline' | 'rate' | 'server' {
  if (code === 'network' || code === 'timeout') return 'offline'
  if (code === 'requests_limit_reached' || code === 'http_429') return 'rate'
  return 'server'
}

export function LoadState({
  loading,
  error,
  hasData,
  onRetry,
  children,
}: {
  loading: boolean
  error: string | null
  hasData: boolean
  onRetry: () => void
  children: ReactNode
}) {
  const { t } = useI18n()
  if (!hasData) {
    if (loading) return <p className="loading">{t('load.loading')}</p>
    return (
      <div className="load-error" role="alert">
        <span>{t('load.error')}</span>
        <button className="btn" onClick={onRetry}>
          {t('load.retry')}
        </button>
      </div>
    )
  }
  return (
    <>
      {error && <div className="load-warning">{t(`load.stale.${errorKind(error)}`, { code: error })}</div>}
      {children}
    </>
  )
}

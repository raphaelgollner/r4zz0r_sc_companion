import { useMemo, useState } from 'react'
import type { Commodity, CommodityStatus, PriceRow } from '../../data/types'
import { formatAuec } from '../../domain/format'
import { useI18n } from '../../i18n/i18n'
import { DataTable, FreshnessBadge, StatusBadge, type Column } from '../../ui/components'
import { TerminalName } from '../../ui/TerminalName'
import { usePrefsFreshness } from './freshnessPrefs'

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function matches(text: string, query: string) {
  return norm(text).includes(norm(query.trim()))
}

/** Campo de busca com lista de commodities (nomes sempre como no jogo). */
export function CommodityPicker({
  commodities,
  value,
  onChange,
}: {
  commodities: Commodity[]
  value: number | null
  onChange: (id: number) => void
}) {
  const { t } = useI18n()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const selected = commodities.find((c) => c.id === value)
  const options = useMemo(
    () =>
      query.trim()
        ? commodities.filter((c) => matches(c.name, query) || matches(c.code, query)).slice(0, 12)
        : [],
    [commodities, query],
  )

  return (
    <div className="picker">
      <input
        className="input"
        role="combobox"
        aria-expanded={open && options.length > 0}
        placeholder={selected ? selected.name : t('common.search')}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
      />
      {open && options.length > 0 && (
        <ul className="picker-list" role="listbox">
          {options.map((c) => (
            <li
              key={c.id}
              role="option"
              aria-selected={c.id === value}
              onClick={() => {
                onChange(c.id)
                setQuery('')
                setOpen(false)
              }}
            >
              {c.name} <span className="muted">{c.code}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Tabela de preços por terminal (ou por commodity, em Locations). */
export function PriceTable({
  rows,
  status,
  now,
  label,
  onRowClick,
  selectedId,
}: {
  rows: PriceRow[]
  status?: CommodityStatus
  now: number
  label: 'terminal' | 'commodity'
  onRowClick?: (r: PriceRow) => void
  selectedId?: number | null
}) {
  const { t } = useI18n()
  const fresh = usePrefsFreshness()
  const stock = (r: PriceRow) => (r.scu_buy > 0 ? r.scu_buy : r.scu_buy_avg)
  const demand = (r: PriceRow) => (r.scu_sell > 0 ? r.scu_sell : r.scu_sell_avg)
  const dash = <span className="muted">—</span>

  const columns: Column<PriceRow>[] = [
    label === 'terminal'
      ? { key: 'name', header: t('col.terminal'), render: (r) => <TerminalName id={r.id_terminal} fallback={r.terminal_name} />, sortValue: (r) => r.terminal_name }
      : { key: 'name', header: t('col.commodity'), render: (r) => r.commodity_name, sortValue: (r) => r.commodity_name },
    { key: 'buy', header: t('col.buy'), align: 'right', render: (r) => (r.price_buy > 0 ? formatAuec(r.price_buy) : dash), sortValue: (r) => r.price_buy },
    { key: 'stock', header: t('col.stock'), align: 'right', render: (r) => (r.price_buy > 0 && stock(r) > 0 ? formatAuec(stock(r)) : dash), sortValue: stock },
    { key: 'sell', header: t('col.sell'), align: 'right', render: (r) => (r.price_sell > 0 ? formatAuec(r.price_sell) : dash), sortValue: (r) => r.price_sell },
    { key: 'demand', header: t('col.demand'), align: 'right', render: (r) => (r.price_sell > 0 && demand(r) > 0 ? formatAuec(demand(r)) : dash), sortValue: demand },
  ]
  if (status)
    columns.push({
      key: 'status',
      header: t('col.status'),
      render: (r) =>
        r.price_buy > 0 ? <StatusBadge code={r.status_buy} levels={status.buy} /> : <StatusBadge code={r.status_sell} levels={status.sell} />,
    })
  columns.push({
    key: 'updated',
    header: t('common.updated'),
    render: (r) => <FreshnessBadge dateModifiedSec={r.date_modified} now={now} {...fresh} />,
    sortValue: (r) => -r.date_modified,
  })

  return <DataTable rows={rows} columns={columns} rowKey={(r) => r.id} initialSort={{ key: 'name', dir: 'asc' }} onRowClick={onRowClick} selectedKey={selectedId} />
}

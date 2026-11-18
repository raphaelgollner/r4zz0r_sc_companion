import { useMemo, useState, type ReactNode } from 'react'
import type { Commodity, CommodityStatus, PriceRow } from '../../data/types'
import { formatAuec } from '../../domain/format'
import { useI18n } from '../../i18n/i18n'
import { DataTable, Panel, SectionLabel } from '../../ui/components'
import { matches, PriceTable } from './shared'

export function CommoditiesView({
  commodities,
  prices,
  status,
  now,
  renderHistory,
}: {
  commodities: Commodity[]
  prices: PriceRow[]
  status: CommodityStatus
  now: number
  renderHistory?: (commodityId: number, row: PriceRow) => ReactNode
}) {
  const { t } = useI18n()
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [historyRow, setHistoryRow] = useState<PriceRow | null>(null)

  const list = useMemo(
    () => (query.trim() ? commodities.filter((c) => matches(c.name, query) || matches(c.code, query)) : commodities),
    [commodities, query],
  )
  const selected = commodities.find((c) => c.id === selectedId) ?? null
  const rows = useMemo(() => prices.filter((p) => p.id_commodity === selectedId), [prices, selectedId])
  const avg = (n: number) => (n > 0 ? formatAuec(n) : <span className="muted">—</span>)

  return (
    <div className="grid-2">
      <Panel>
        <SectionLabel>{t('commodities.title')}</SectionLabel>
        <div className="row" style={{ marginBottom: 12 }}>
          <input className="input" placeholder={t('common.search')} value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <DataTable
          rows={list}
          rowKey={(c) => c.id}
          selectedKey={selectedId}
          onRowClick={(c) => {
            setSelectedId(c.id)
            setHistoryRow(null)
          }}
          initialSort={{ key: 'name', dir: 'asc' }}
          columns={[
            { key: 'name', header: t('col.commodity'), render: (c) => c.name, sortValue: (c) => c.name },
            { key: 'code', header: t('col.code'), render: (c) => <span className="muted">{c.code}</span>, sortValue: (c) => c.code },
            { key: 'kind', header: t('col.kind'), render: (c) => c.kind ?? '—', sortValue: (c) => c.kind ?? '' },
            { key: 'buy', header: t('col.avgBuy'), align: 'right', render: (c) => avg(c.price_buy), sortValue: (c) => c.price_buy },
            { key: 'sell', header: t('col.avgSell'), align: 'right', render: (c) => avg(c.price_sell), sortValue: (c) => c.price_sell },
          ]}
        />
      </Panel>
      <div role="region" aria-label={selected?.name ?? t('commodities.pricesAt')}>
        <Panel title={selected ? `${selected.name} · ${t('commodities.pricesAt')}` : t('commodities.pricesAt')} glow>
          {selected ? (
            <>
              <PriceTable
                rows={rows}
                status={status}
                now={now}
                label="terminal"
                onRowClick={renderHistory ? setHistoryRow : undefined}
                selectedId={historyRow?.id ?? null}
              />
              {renderHistory && (historyRow ? renderHistory(selected.id, historyRow) : <p className="muted hint">{t('history.hint')}</p>)}
            </>
          ) : (
            <p className="muted">{t('commodities.pick')}</p>
          )}
        </Panel>
      </div>
    </div>
  )
}

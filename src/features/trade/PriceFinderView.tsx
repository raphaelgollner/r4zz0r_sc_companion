import { useMemo, useState } from 'react'
import type { Commodity, PriceRow } from '../../data/types'
import { formatAuec } from '../../domain/format'
import { bestPlaces } from '../../domain/priceFinder'
import { useI18n } from '../../i18n/i18n'
import { DataTable, FreshnessBadge, Panel, SectionLabel, Tabs } from '../../ui/components'
import { TerminalName } from '../../ui/TerminalName'
import { usePrefsFreshness } from './freshnessPrefs'
import { CommodityPicker } from './shared'

type Side = 'sell' | 'buy'

export function PriceFinderView({ commodities, prices, now }: { commodities: Commodity[]; prices: PriceRow[]; now: number }) {
  const { t } = useI18n()
  const fresh = usePrefsFreshness()
  const [commodityId, setCommodityId] = useState<number | null>(null)
  const [side, setSide] = useState<Side>('sell')
  const selected = commodities.find((c) => c.id === commodityId)
  const rows = useMemo(() => (commodityId ? bestPlaces(prices, commodityId, side, 15) : []), [prices, commodityId, side])

  const qty = (r: PriceRow) =>
    side === 'buy' ? (r.scu_buy > 0 ? r.scu_buy : r.scu_buy_avg) : r.scu_sell > 0 ? r.scu_sell : r.scu_sell_avg

  return (
    <Panel>
      <SectionLabel>{t('finder.title')}</SectionLabel>
      <div className="row" style={{ marginBottom: 14 }}>
        <CommodityPicker commodities={commodities} value={commodityId} onChange={setCommodityId} />
        {selected && <h2 style={{ fontSize: 16, color: 'var(--gold)' }}>{selected.name}</h2>}
      </div>
      <Tabs
        sub
        items={[
          { key: 'sell' as Side, label: t('finder.whereSell') },
          { key: 'buy' as Side, label: t('finder.whereBuy') },
        ]}
        active={side}
        onChange={setSide}
      />
      {!selected ? (
        <p className="muted">{t('finder.pick')}</p>
      ) : (
        <DataTable
          rows={rows}
          rowKey={(r) => r.id}
          empty={t('finder.noPrice')}
          columns={[
            { key: 'terminal', header: t('col.terminal'), render: (r) => <TerminalName id={r.id_terminal} fallback={r.terminal_name} /> },
            { key: 'price', header: t('col.price'), align: 'right', render: (r) => formatAuec(side === 'buy' ? r.price_buy : r.price_sell) },
            {
              key: 'qty',
              header: side === 'buy' ? t('col.stock') : t('col.demand'),
              align: 'right',
              render: (r) => (qty(r) > 0 ? formatAuec(qty(r)) : <span className="muted">—</span>),
            },
            { key: 'updated', header: t('common.updated'), render: (r) => <FreshnessBadge dateModifiedSec={r.date_modified} now={now} {...fresh} /> },
          ]}
        />
      )}
    </Panel>
  )
}

import { useMemo } from 'react'
import type { CurrencyIndex, CurrencyIndexPoint } from '../../data/types'
import { formatAuec, formatDecimal, formatPercent } from '../../domain/format'
import { useI18n } from '../../i18n/i18n'
import { DataTable, FreshnessBadge, Panel, SectionLabel } from '../../ui/components'
import { Sparkline } from '../../ui/Sparkline'

export function CurrenciesView({ index, history, now }: { index: CurrencyIndex[]; history: CurrencyIndexPoint[]; now: number }) {
  const { t } = useI18n()
  const current = index.find((i) => i.currency === 'UEC') ?? index[0]
  const points = useMemo(() => [...history].sort((a, b) => a.date_added - b.date_added).map((p) => p.index_value), [history])

  if (!current) return <p className="muted">{t('common.none')}</p>

  return (
    <div className="stack">
      <Panel glow>
        <SectionLabel>{t('currencies.title')} · {current.currency}</SectionLabel>
        <div className="row" style={{ gap: 40, alignItems: 'center' }}>
          <div>
            <div className="field">{t('currencies.index')}</div>
            <div className="big-number">{formatDecimal(current.index_value)}</div>
          </div>
          <div>
            <div className="field">{t('currencies.basket')}</div>
            <div className="num" style={{ fontSize: 20 }}>{formatAuec(current.basket_value)} aUEC</div>
          </div>
          <FreshnessBadge dateModifiedSec={current.date_modified} now={now} />
        </div>
        <p className="muted" style={{ marginTop: 12 }}>{t('currencies.explain')}</p>
        {points.length > 1 && (
          <>
            <SectionLabel>{t('currencies.history')}</SectionLabel>
            <Sparkline points={points} />
          </>
        )}
      </Panel>
      <Panel>
        <SectionLabel>{t('currencies.components')}</SectionLabel>
        <DataTable
          rows={current.components}
          rowKey={(c) => c.id_commodity}
          initialSort={{ key: 'weight', dir: 'desc' }}
          columns={[
            { key: 'name', header: t('col.commodity'), render: (c) => c.commodity_name, sortValue: (c) => c.commodity_name },
            { key: 'weight', header: t('col.weight'), align: 'right', render: (c) => formatPercent(c.weight * 100), sortValue: (c) => c.weight },
            { key: 'avg', header: t('col.avgPrice'), align: 'right', render: (c) => formatAuec(c.avg_price), sortValue: (c) => c.avg_price },
            { key: 'base', header: t('col.basePrice'), align: 'right', render: (c) => formatAuec(c.base_price), sortValue: (c) => c.base_price },
          ]}
        />
      </Panel>
    </div>
  )
}

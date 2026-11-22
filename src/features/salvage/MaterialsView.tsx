import { useMemo, type ReactNode } from 'react'
import type { Commodity, CommodityStatus, PriceRow } from '../../data/types'
import { formatAuec } from '../../domain/format'
import { useI18n } from '../../i18n/i18n'
import { DataTable, FreshnessBadge, Panel, SectionLabel } from '../../ui/components'
import { TerminalName } from '../../ui/TerminalName'
import { CommoditiesView } from '../trade/CommoditiesView'

export function MaterialsSummary({ materials, prices, now }: { materials: Commodity[]; prices: PriceRow[]; now: number }) {
  const { t } = useI18n()
  const rows = useMemo(
    () =>
      materials.map((c) => {
        let best: PriceRow | null = null
        let count = 0
        for (const p of prices)
          if (p.id_commodity === c.id && p.price_sell > 0) {
            count++
            if (!best || p.price_sell > best.price_sell) best = p
          }
        return { c, best, count }
      }),
    [materials, prices],
  )
  const dash = <span className="muted">—</span>
  return (
    <Panel glow>
      <SectionLabel>{t('salvage.bestSell')}</SectionLabel>
      <DataTable
        rows={rows}
        rowKey={(r) => r.c.id}
        columns={[
          { key: 'm', header: t('col.commodity'), render: (r) => r.c.name },
          { key: 'p', header: t('salvage.bestPrice'), align: 'right', render: (r) => (r.best ? <b className="num">{formatAuec(r.best.price_sell)} aUEC</b> : dash) },
          { key: 't', header: t('col.terminal'), render: (r) => (r.best ? <TerminalName id={r.best.id_terminal} fallback={r.best.terminal_name} /> : dash) },
          { key: 'n', header: t('salvage.buyers'), align: 'right', render: (r) => r.count },
          { key: 'u', header: t('common.updated'), render: (r) => (r.best ? <FreshnessBadge dateModifiedSec={r.best.date_modified} now={now} /> : dash) },
        ]}
      />
    </Panel>
  )
}

export function MaterialsView({
  materials,
  prices,
  status,
  now,
  renderHistory,
}: {
  materials: Commodity[]
  prices: PriceRow[]
  status: CommodityStatus
  now: number
  renderHistory?: (commodityId: number, row: PriceRow) => ReactNode
}) {
  return (
    <div className="stack">
      <MaterialsSummary materials={materials} prices={prices} now={now} />
      <CommoditiesView commodities={materials} prices={prices} status={status} now={now} renderHistory={renderHistory} />
    </div>
  )
}

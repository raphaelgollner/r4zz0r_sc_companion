import { useMemo } from 'react'
import type { Commodity, Moon, Planet, PriceRow, RawPriceRow } from '../../data/types'
import { formatAuec, formatPercent } from '../../domain/format'
import { whereFound } from '../../domain/locations'
import { isRawOre, oreSummary } from '../../domain/mining'
import { useI18n } from '../../i18n/i18n'
import { DataTable, Panel, SectionLabel } from '../../ui/components'
import { TerminalName } from '../../ui/TerminalName'

export function OresView({
  commodities,
  rawPrices,
  prices,
  planets,
  moons,
}: {
  commodities: Commodity[]
  rawPrices: RawPriceRow[]
  prices: PriceRow[]
  planets: Map<number, Planet>
  moons: Map<number, Moon>
  now: number
}) {
  const { t } = useI18n()
  const rows = useMemo(
    () => oreSummary(commodities.filter(isRawOre), commodities, rawPrices, prices).map((r) => ({ ...r, found: whereFound(r.ore, planets, moons) })),
    [commodities, rawPrices, prices, planets, moons],
  )
  const dash = <span className="muted">—</span>

  return (
    <Panel>
      <SectionLabel>Ores</SectionLabel>
      <DataTable
        rows={rows}
        rowKey={(r) => r.ore.id}
        initialSort={{ key: 'refinedPrice', dir: 'desc' }}
        columns={[
          { key: 'ore', header: t('mining.ore'), render: (r) => r.ore.name, sortValue: (r) => r.ore.name },
          {
            key: 'raw',
            header: t('mining.rawBest'),
            render: (r) => (r.bestRaw ? <TerminalName id={r.bestRaw.id_terminal} fallback={r.bestRaw.terminal_name} /> : dash),
          },
          {
            key: 'rawPrice',
            header: '',
            align: 'right',
            render: (r) => (r.bestRaw ? formatAuec(r.bestRaw.price_sell) : dash),
            sortValue: (r) => r.bestRaw?.price_sell ?? 0,
          },
          {
            key: 'refined',
            header: t('mining.refinedBest'),
            render: (r) =>
              r.refined ? (
                r.bestRefined ? (
                  <>
                    {r.refined.name} · <TerminalName id={r.bestRefined.id_terminal} fallback={r.bestRefined.terminal_name} />
                  </>
                ) : (
                  r.refined.name
                )
              ) : (
                <span className="muted">{t('mining.noRefined')}</span>
              ),
          },
          {
            key: 'refinedPrice',
            header: '',
            align: 'right',
            render: (r) => (r.bestRefined ? formatAuec(r.bestRefined.price_sell) : dash),
            sortValue: (r) => r.bestRefined?.price_sell ?? 0,
          },
          {
            key: 'uplift',
            header: t('mining.uplift'),
            align: 'right',
            render: (r) => (r.uplift === null ? dash : <span className={r.uplift >= 0 ? 'profit' : 'loss'}>{formatPercent(r.uplift)}</span>),
            sortValue: (r) => r.uplift ?? -Infinity,
          },
          { key: 'found', header: t('col.whereFound'), render: (r) => (r.found.length ? r.found.join(', ') : dash) },
        ]}
      />
    </Panel>
  )
}

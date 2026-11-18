import { useMemo } from 'react'
import type { Commodity, Moon, Planet, PriceRow } from '../../data/types'
import { formatAuec } from '../../domain/format'
import { whereFound } from '../../domain/locations'
import { bestPlaces } from '../../domain/priceFinder'
import { useI18n } from '../../i18n/i18n'
import { DataTable, FreshnessBadge, Panel, SectionLabel } from '../../ui/components'
import { TerminalName } from '../../ui/TerminalName'
import { usePrefsFreshness } from './freshnessPrefs'

export function HarvestablesView({
  commodities,
  prices,
  planets,
  moons,
  now,
}: {
  commodities: Commodity[]
  prices: PriceRow[]
  planets: Map<number, Planet>
  moons: Map<number, Moon>
  now: number
}) {
  const { t } = useI18n()
  const fresh = usePrefsFreshness()
  const rows = useMemo(
    () =>
      commodities
        .filter((c) => c.is_harvestable)
        .map((c) => ({ c, best: bestPlaces(prices, c.id, 'sell', 1)[0] ?? null, found: whereFound(c, planets, moons) })),
    [commodities, prices, planets, moons],
  )

  return (
    <Panel>
      <SectionLabel>{t('harvest.title')}</SectionLabel>
      <DataTable
        rows={rows}
        rowKey={(r) => r.c.id}
        initialSort={{ key: 'price', dir: 'desc' }}
        columns={[
          { key: 'name', header: t('col.commodity'), render: (r) => r.c.name, sortValue: (r) => r.c.name },
          {
            key: 'best',
            header: t('col.bestSell'),
            render: (r) => (r.best ? <TerminalName id={r.best.id_terminal} fallback={r.best.terminal_name} /> : <span className="muted">{t('harvest.notSold')}</span>),
          },
          {
            key: 'price',
            header: t('col.price'),
            align: 'right',
            render: (r) => (r.best ? formatAuec(r.best.price_sell) : <span className="muted">—</span>),
            sortValue: (r) => r.best?.price_sell ?? 0,
          },
          { key: 'found', header: t('col.whereFound'), render: (r) => (r.found.length ? r.found.join(', ') : <span className="muted">—</span>) },
          {
            key: 'updated',
            header: t('common.updated'),
            render: (r) => (r.best ? <FreshnessBadge dateModifiedSec={r.best.date_modified} now={now} {...fresh} /> : null),
          },
        ]}
      />
    </Panel>
  )
}

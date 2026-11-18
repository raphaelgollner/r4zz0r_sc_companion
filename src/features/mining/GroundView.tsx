import { useMemo } from 'react'
import type { Commodity, Moon, Planet, PriceRow, Vehicle, VehiclePrice, VehicleRent } from '../../data/types'
import { formatAuec } from '../../domain/format'
import { whereFound } from '../../domain/locations'
import { bestPlaces } from '../../domain/priceFinder'
import { shipOffers } from '../../domain/ships'
import { useI18n } from '../../i18n/i18n'
import { DataTable, FreshnessBadge, Panel, SectionLabel } from '../../ui/components'
import { TerminalName } from '../../ui/TerminalName'

export function GroundView({
  commodities,
  prices,
  planets,
  moons,
  vehicles,
  purchases,
  rentals,
  now,
}: {
  commodities: Commodity[]
  prices: PriceRow[]
  planets: Map<number, Planet>
  moons: Map<number, Moon>
  vehicles: Vehicle[]
  purchases: VehiclePrice[]
  rentals: VehicleRent[]
  now: number
}) {
  const { t } = useI18n()
  const dash = <span className="muted">—</span>
  const gems = useMemo(
    () =>
      commodities
        .filter((c) => c.is_harvestable && c.is_raw && (c.ids_planets || c.ids_moons))
        .map((c) => ({ c, best: bestPlaces(prices, c.id, 'sell', 1)[0] ?? null, found: whereFound(c, planets, moons) })),
    [commodities, prices, planets, moons],
  )
  const rovers = useMemo(
    () => vehicles.filter((v) => v.is_ground_vehicle && v.is_mining).map((v) => ({ v, offers: shipOffers(v.id, purchases, rentals) })),
    [vehicles, purchases, rentals],
  )

  return (
    <div className="stack">
      <Panel>
        <SectionLabel>{t('mining.gems')}</SectionLabel>
        <DataTable
          rows={gems}
          rowKey={(r) => r.c.id}
          initialSort={{ key: 'price', dir: 'desc' }}
          columns={[
            { key: 'name', header: t('col.commodity'), render: (r) => r.c.name, sortValue: (r) => r.c.name },
            { key: 'best', header: t('col.bestSell'), render: (r) => (r.best ? <TerminalName id={r.best.id_terminal} fallback={r.best.terminal_name} /> : dash) },
            { key: 'price', header: t('col.price'), align: 'right', render: (r) => (r.best ? formatAuec(r.best.price_sell) : dash), sortValue: (r) => r.best?.price_sell ?? 0 },
            { key: 'found', header: t('col.whereFound'), render: (r) => (r.found.length ? r.found.join(', ') : dash) },
            { key: 'u', header: t('common.updated'), render: (r) => (r.best ? <FreshnessBadge dateModifiedSec={r.best.date_modified} now={now} /> : null) },
          ]}
        />
      </Panel>
      <Panel>
        <SectionLabel>{t('mining.groundVehicles')}</SectionLabel>
        <DataTable
          rows={rovers}
          rowKey={(r) => r.v.id}
          columns={[
            { key: 'name', header: t('ships.col.ship'), render: (r) => r.v.name_full, sortValue: (r) => r.v.name_full },
            {
              key: 'buy',
              header: t('ships.col.buyFrom'),
              align: 'right',
              render: (r) => (r.offers.minBuy ? formatAuec(r.offers.minBuy) : <span className="muted">{t('ships.notSold')}</span>),
            },
            {
              key: 'where',
              header: t('ships.whereBuy'),
              render: (r) => (r.offers.buy[0] ? <TerminalName id={r.offers.buy[0].id_terminal} fallback={r.offers.buy[0].terminal_name} /> : dash),
            },
            { key: 'rent', header: t('ships.col.rentFrom'), align: 'right', render: (r) => (r.offers.minRent ? formatAuec(r.offers.minRent) : dash) },
          ]}
        />
      </Panel>
    </div>
  )
}

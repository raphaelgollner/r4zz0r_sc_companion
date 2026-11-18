import { useMemo } from 'react'
import { useTerminal } from '../../data/terminals'
import type { Vehicle, VehiclePrice, VehicleRent } from '../../data/types'
import { formatAuec } from '../../domain/format'
import { locationPath } from '../../domain/location'
import { shipRoles } from '../../domain/ships'
import { useI18n } from '../../i18n/i18n'
import { DataTable, FreshnessBadge, SectionLabel } from '../../ui/components'
import { Dialog } from '../../ui/Dialog'

interface Offer {
  id: number
  vehicle: Vehicle
  price: number
  date_modified: number
}

export function StoreDialog({
  terminalId,
  terminalName,
  vehicles,
  purchases,
  rentals,
  now,
  onPickShip,
  onClose,
}: {
  terminalId: number
  terminalName: string
  vehicles: Vehicle[]
  purchases: VehiclePrice[]
  rentals: VehicleRent[]
  now: number
  onPickShip: (id: number) => void
  onClose: () => void
}) {
  const { t } = useI18n()
  const terminal = useTerminal(terminalId)
  const byId = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles])

  const offers = <T extends VehiclePrice | VehicleRent>(list: T[], price: (o: T) => number): Offer[] =>
    list
      .filter((o) => o.id_terminal === terminalId && price(o) > 0 && byId.has(o.id_vehicle))
      .map((o) => ({ id: o.id, vehicle: byId.get(o.id_vehicle)!, price: price(o), date_modified: o.date_modified }))
      .sort((a, b) => a.vehicle.name_full.localeCompare(b.vehicle.name_full))

  const forSale = offers(purchases, (o) => o.price_buy)
  const forRent = offers(rentals, (o) => o.price_rent)

  const table = (rows: Offer[], empty: string) => (
    <DataTable
      rows={rows}
      rowKey={(o) => o.id}
      empty={empty}
      onRowClick={(o) => {
        onPickShip(o.vehicle.id)
        onClose()
      }}
      columns={[
        { key: 'ship', header: t('ships.col.ship'), render: (o) => o.vehicle.name_full },
        { key: 'role', header: t('ships.col.role'), render: (o) => shipRoles(o.vehicle).map((r) => <span key={r} className="chip">{t(`role.${r}`)}</span>) },
        { key: 'price', header: t('col.price'), align: 'right', render: (o) => `${formatAuec(o.price)} aUEC` },
        { key: 'u', header: t('common.updated'), render: (o) => <FreshnessBadge dateModifiedSec={o.date_modified} now={now} /> },
      ]}
    />
  )

  return (
    <Dialog title={terminalName} onClose={onClose}>
      <p className="location-line">{terminal ? locationPath(terminal).join(' › ') : t('store.unknownLocation')}</p>
      <SectionLabel>{t('store.forSale')}</SectionLabel>
      {table(forSale, t('store.noneForSale'))}
      <div style={{ height: 16 }} />
      <SectionLabel>{t('store.forRent')}</SectionLabel>
      {table(forRent, t('store.noneForRent'))}
    </Dialog>
  )
}

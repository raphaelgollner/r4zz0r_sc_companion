import { useMemo, useState } from 'react'
import type { Vehicle, VehiclePrice, VehicleRent } from '../../data/types'
import { formatAuec } from '../../domain/format'
import { SHIP_ROLES, searchShips, shipOffers, shipRoles, type ShipRole } from '../../domain/ships'
import { useI18n } from '../../i18n/i18n'
import { DataTable, FreshnessBadge, Panel, SectionLabel } from '../../ui/components'
import { TerminalName } from '../../ui/TerminalName'
import { Tooltip } from '../../ui/Tooltip'
import { StoreDialog } from './StoreDialog'

export function ShipsView({
  vehicles,
  purchases,
  rentals,
  now,
}: {
  vehicles: Vehicle[]
  purchases: VehiclePrice[]
  rentals: VehicleRent[]
  now: number
}) {
  const { t } = useI18n()
  const [query, setQuery] = useState('')
  const [role, setRole] = useState<ShipRole | ''>('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [store, setStore] = useState<{ id: number; name: string } | null>(null)

  const rows = useMemo(
    () =>
      searchShips(vehicles, query, role || undefined).map((v) => ({
        v,
        roles: shipRoles(v),
        offers: shipOffers(v.id, purchases, rentals),
      })),
    [vehicles, purchases, rentals, query, role],
  )
  const selected = useMemo(() => {
    const v = vehicles.find((x) => x.id === selectedId)
    return v ? { v, roles: shipRoles(v), offers: shipOffers(v.id, purchases, rentals) } : null
  }, [vehicles, purchases, rentals, selectedId])
  const dash = <span className="muted">—</span>
  const roleLabel = (r: ShipRole) => t(`role.${r}`)

  return (
    <div className="grid-2 ships-grid">
      <Panel>
        <SectionLabel>{t('ships.title')}</SectionLabel>
        <div className="row" style={{ marginBottom: 12 }}>
          <input className="input" style={{ minWidth: 280 }} placeholder={t('ships.search')} value={query} onChange={(e) => setQuery(e.target.value)} />
          <label className="field">
            {t('ships.col.role')}
            <select className="select" value={role} onChange={(e) => setRole(e.target.value as ShipRole | '')}>
              <option value="">{t('ships.allRoles')}</option>
              {SHIP_ROLES.map((r) => (
                <option key={r} value={r}>
                  {roleLabel(r)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <DataTable
          rows={rows}
          rowKey={(r) => r.v.id}
          selectedKey={selectedId}
          onRowClick={(r) => setSelectedId(r.v.id)}
          initialSort={{ key: 'ship', dir: 'asc' }}
          columns={[
            { key: 'ship', header: t('ships.col.ship'), render: (r) => r.v.name_full, sortValue: (r) => r.v.name_full },
            { key: 'maker', header: t('ships.col.maker'), render: (r) => r.v.company_name ?? '—', sortValue: (r) => r.v.company_name ?? '' },
            {
              key: 'role',
              header: t('ships.col.role'),
              render: (r) =>
                r.roles.length ? (
                  <Tooltip content={r.roles.map(roleLabel).join(', ')}>
                    {r.roles.map((x) => <span key={x} className="chip">{roleLabel(x)}</span>)}
                  </Tooltip>
                ) : (
                  dash
                ),
            },
            { key: 'scu', header: t('ships.col.scu'), align: 'right', render: (r) => (r.v.scu > 0 ? r.v.scu : dash), sortValue: (r) => r.v.scu },
            { key: 'crew', header: t('ships.col.crew'), align: 'right', render: (r) => r.v.crew || dash },
            { key: 'pad', header: t('ships.col.pad'), render: (r) => r.v.pad_type || dash, sortValue: (r) => r.v.pad_type ?? '' },
            {
              key: 'buy',
              header: t('ships.col.buyFrom'),
              align: 'right',
              render: (r) => (r.offers.minBuy ? formatAuec(r.offers.minBuy) : <span className="muted">{t('ships.notSold')}</span>),
              sortValue: (r) => r.offers.minBuy ?? Number.MAX_SAFE_INTEGER,
            },
            {
              key: 'rent',
              header: t('ships.col.rentFrom'),
              align: 'right',
              render: (r) => (r.offers.minRent ? formatAuec(r.offers.minRent) : dash),
              sortValue: (r) => r.offers.minRent ?? Number.MAX_SAFE_INTEGER,
            },
          ]}
        />
      </Panel>

      <div role="region" aria-label={selected?.v.name_full ?? t('ships.title')} className="sticky">
        {selected ? (
          <Panel title={selected.v.name_full} glow>
            {selected.v.url_photo && (
              <img
                key={selected.v.id}
                className="ship-photo"
                src={selected.v.url_photo}
                alt={selected.v.name_full}
                referrerPolicy="no-referrer"
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
            )}
            <p>{selected.roles.map((x) => <span key={x} className="chip">{roleLabel(x)}</span>)}</p>
            <SectionLabel>{t('ships.whereBuy')}</SectionLabel>
            <DataTable
              rows={selected.offers.buy}
              rowKey={(o) => o.id}
              empty={t('ships.notSold')}
              columns={[
                { key: 't', header: t('col.terminal'), render: (o) => (
                  <button className="link-cell" onClick={() => setStore({ id: o.id_terminal, name: o.terminal_name })}>
                    <TerminalName id={o.id_terminal} fallback={o.terminal_name} />
                  </button>
                ) },
                { key: 'p', header: t('col.price'), align: 'right', render: (o) => `${formatAuec(o.price_buy)} aUEC` },
                { key: 'u', header: t('common.updated'), render: (o) => <FreshnessBadge dateModifiedSec={o.date_modified} now={now} /> },
              ]}
            />
            <div style={{ height: 14 }} />
            <SectionLabel>{t('ships.whereRent')}</SectionLabel>
            <DataTable
              rows={selected.offers.rent}
              rowKey={(o) => o.id}
              empty={t('ships.noRent')}
              columns={[
                { key: 't', header: t('col.terminal'), render: (o) => (
                  <button className="link-cell" onClick={() => setStore({ id: o.id_terminal, name: o.terminal_name })}>
                    <TerminalName id={o.id_terminal} fallback={o.terminal_name} />
                  </button>
                ) },
                { key: 'p', header: t('col.price'), align: 'right', render: (o) => `${formatAuec(o.price_rent)} aUEC` },
                { key: 'u', header: t('common.updated'), render: (o) => <FreshnessBadge dateModifiedSec={o.date_modified} now={now} /> },
              ]}
            />
          </Panel>
        ) : (
          <Panel glow>
            <p className="muted">{t('ships.search')}</p>
          </Panel>
        )}
      </div>
      {store && (
        <StoreDialog
          terminalId={store.id}
          terminalName={store.name}
          vehicles={vehicles}
          purchases={purchases}
          rentals={rentals}
          now={now}
          onPickShip={setSelectedId}
          onClose={() => setStore(null)}
        />
      )}
    </div>
  )
}

import { useMemo, useState } from 'react'
import type { PledgePrice, Vehicle, VehiclePrice, VehicleRent } from '../../data/types'
import { bestAuec, fleetTotals, usdPrice, type FleetEntry } from '../../domain/fleet'
import { formatAuec } from '../../domain/format'
import { shipOffers, shipRoles, type ShipRole } from '../../domain/ships'
import { useI18n } from '../../i18n/i18n'
import { effectiveScu, type Prefs } from '../../store/prefs'
import { DataTable, FreshnessBadge, Panel, SectionLabel } from '../../ui/components'
import { SearchPicker } from '../../ui/SearchPicker'
import { TerminalCopy, TerminalName } from '../../ui/TerminalName'
import { Tooltip } from '../../ui/Tooltip'
import { StoreDialog } from '../ships/StoreDialog'

export const formatUsd = (n: number) => `US$ ${formatAuec(n)}`

interface Row {
  entry: FleetEntry
  v: Vehicle | null
  roles: ShipRole[]
  usd: number | null
  auec: VehiclePrice | null
}

export function FleetView({
  entries,
  vehicles,
  pledge,
  purchases,
  rentals,
  prefs,
  now,
  onAdd,
  onUpdate,
  onRemove,
  onOpenSetup,
}: {
  entries: FleetEntry[]
  vehicles: Vehicle[]
  pledge: PledgePrice[]
  purchases: VehiclePrice[]
  rentals: VehicleRent[]
  prefs: Prefs
  now: number
  onAdd: (vehicleId: number) => void
  onUpdate: (id: string, patch: Partial<Omit<FleetEntry, 'id'>>) => void
  onRemove: (id: string) => void
  onOpenSetup: (id: string) => void
}) {
  const { t } = useI18n()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [store, setStore] = useState<{ id: number; name: string } | null>(null)
  const byId = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles])
  const sorted = useMemo(() => [...vehicles].sort((a, b) => a.name_full.localeCompare(b.name_full)), [vehicles])
  const totals = useMemo(() => fleetTotals(entries, byId, pledge, purchases), [entries, byId, pledge, purchases])

  const rows: Row[] = useMemo(
    () =>
      entries.map((entry) => {
        const v = byId.get(entry.vehicleId) ?? null
        return { entry, v, roles: v ? shipRoles(v) : [], usd: v ? usdPrice(v.id, pledge) : null, auec: v ? bestAuec(v.id, purchases) : null }
      }),
    [entries, byId, pledge, purchases],
  )
  const selected = rows.find((r) => r.entry.id === selectedId && r.v) ?? null
  const offers = selected?.v ? shipOffers(selected.v.id, purchases, rentals) : null
  const dash = <span className="muted">—</span>
  const shipName = (r: Row) => (r.v ? r.v.name_full : t('fleet.unknown', { id: r.entry.vehicleId }))

  const remove = (id: string) => {
    onRemove(id)
    setConfirmId(null)
    if (selectedId === id) setSelectedId(null)
  }

  return (
    <div className="grid-2 ships-grid">
      <Panel>
        <SectionLabel>{t('fleet.title')}</SectionLabel>
        <div className="row" style={{ marginBottom: 12, alignItems: 'flex-start' }}>
          <SearchPicker
            items={sorted}
            ariaLabel={t('fleet.add')}
            placeholder={t('fleet.add')}
            value={null}
            label={(v) => v.name_full}
            text={(v) => `${v.name_full} ${v.name} ${v.company_name ?? ''}`}
            sub={(v) => v.company_name ?? null}
            onPick={(v) => onAdd(v.id)}
          />
        </div>
        <div className="fleet-totals" data-testid="fleet-totals">
          <b>{t('fleet.count', { n: totals.count })}</b>
          <span>
            · <b className="num">{formatUsd(totals.usd)}</b>
          </span>
          <span>
            · <b className="num">{formatAuec(totals.auec)} aUEC</b>
          </span>
          {totals.missingUsd > 0 && <span className="warn">{t('fleet.missingUsd', { n: totals.missingUsd })}</span>}
          {totals.missingAuec > 0 && <span className="warn">{t('fleet.missingAuec', { n: totals.missingAuec })}</span>}
        </div>
        <DataTable
          rows={rows}
          rowKey={(r) => r.entry.id}
          selectedKey={selectedId}
          onRowClick={(r) => r.v && setSelectedId(r.entry.id)}
          empty={t('fleet.empty')}
          columns={[
            {
              key: 'ship',
              header: t('ships.col.ship'),
              render: (r) => (
                <span className={r.v ? undefined : 'warn'}>
                  {r.entry.nickname ? (
                    <>
                      <b>{r.entry.nickname}</b> <span className="muted">{shipName(r)}</span>
                    </>
                  ) : (
                    shipName(r)
                  )}
                </span>
              ),
              sortValue: (r) => r.entry.nickname || shipName(r),
            },
            { key: 'maker', header: t('ships.col.maker'), render: (r) => r.v?.company_name ?? dash },
            {
              key: 'role',
              header: t('ships.col.role'),
              render: (r) =>
                r.roles.length ? (
                  <Tooltip content={r.roles.map((x) => t(`role.${x}`)).join(', ')}>
                    {r.roles.map((x) => (
                      <span key={x} className="chip">
                        {t(`role.${x}`)}
                      </span>
                    ))}
                  </Tooltip>
                ) : (
                  dash
                ),
            },
            {
              key: 'scu',
              header: t('ships.col.scu'),
              align: 'right',
              render: (r) => (r.v && effectiveScu(prefs, r.v) > 0 ? effectiveScu(prefs, r.v) : dash),
            },
            { key: 'crew', header: t('ships.col.crew'), align: 'right', render: (r) => r.v?.crew || dash },
            {
              key: 'usd',
              header: t('fleet.col.usd'),
              align: 'right',
              render: (r) => (r.usd !== null ? formatUsd(r.usd) : dash),
              sortValue: (r) => r.usd ?? -1,
            },
            {
              key: 'auec',
              header: t('ships.col.buyFrom'),
              align: 'right',
              render: (r) => (r.auec ? `${formatAuec(r.auec.price_buy)} aUEC` : r.v ? <span className="muted">{t('ships.notSold')}</span> : dash),
              sortValue: (r) => r.auec?.price_buy ?? -1,
            },
            {
              key: 'actions',
              header: '',
              render: (r) =>
                confirmId === r.entry.id ? (
                  <span className="row" style={{ gap: 6 }} onClick={(e) => e.stopPropagation()}>
                    <button className="btn-link danger" onClick={() => remove(r.entry.id)}>
                      {t('fleet.confirmRemove')}
                    </button>
                    <button className="btn-link" onClick={() => setConfirmId(null)}>
                      {t('common.cancel')}
                    </button>
                  </span>
                ) : (
                  <button
                    className="btn-link danger"
                    onClick={(e) => {
                      e.stopPropagation()
                      setConfirmId(r.entry.id)
                    }}
                  >
                    {t('planner.remove')}
                  </button>
                ),
            },
          ]}
        />
      </Panel>

      <div role="region" aria-label={selected?.v?.name_full ?? t('fleet.title')} className="sticky">
        {selected?.v && offers ? (
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
            <div className="row">
              <label className="field">
                {t('fleet.nickname')}
                <input className="input" value={selected.entry.nickname} onChange={(e) => onUpdate(selected.entry.id, { nickname: e.target.value })} />
              </label>
              <button className="btn primary" onClick={() => onOpenSetup(selected.entry.id)}>
                {t('fleet.openSetup')}
              </button>
            </div>
            <label className="field" style={{ marginTop: 8 }}>
              {t('fleet.note')}
              <textarea className="input" rows={2} value={selected.entry.note} onChange={(e) => onUpdate(selected.entry.id, { note: e.target.value })} />
            </label>
            <div style={{ height: 14 }} />
            <SectionLabel>{t('ships.whereBuy')}</SectionLabel>
            <DataTable
              rows={offers.buy}
              rowKey={(o) => o.id}
              empty={t('ships.notSold')}
              columns={[
                {
                  key: 't',
                  header: t('col.terminal'),
                  render: (o) => (
                    <>
                      <button className="link-cell" onClick={() => setStore({ id: o.id_terminal, name: o.terminal_name })}>
                        <TerminalName id={o.id_terminal} fallback={o.terminal_name} copy={false} />
                      </button>
                      <TerminalCopy id={o.id_terminal} fallback={o.terminal_name} />
                    </>
                  ),
                },
                { key: 'p', header: t('col.price'), align: 'right', render: (o) => `${formatAuec(o.price_buy)} aUEC` },
                { key: 'u', header: t('common.updated'), render: (o) => <FreshnessBadge dateModifiedSec={o.date_modified} now={now} /> },
              ]}
            />
          </Panel>
        ) : (
          <Panel glow>
            <p className="muted">{t('fleet.hint')}</p>
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
          onPickShip={() => {}}
          onClose={() => setStore(null)}
        />
      )}
    </div>
  )
}

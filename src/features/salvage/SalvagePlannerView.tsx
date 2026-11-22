import { useMemo } from 'react'
import type { Commodity, PriceRow, Terminal, Vehicle } from '../../data/types'
import { formatAuec } from '../../domain/format'
import { locationPath, placeName } from '../../domain/location'
import { capacityWarning, salvagePlan } from '../../domain/salvage'
import { useI18n } from '../../i18n/i18n'
import type { SalvagePrefs } from '../../store/salvagePrefs'
import { DataTable, FreshnessBadge, Panel, SectionLabel } from '../../ui/components'
import { ScuInput } from '../../ui/ScuInput'
import { SearchPicker } from '../../ui/SearchPicker'
import { TerminalName } from '../../ui/TerminalName'

export function SalvagePlannerView({
  materials,
  prices,
  ships,
  fleetIds,
  scuOf,
  terminals,
  distances,
  prefs,
  onPrefs,
  now,
}: {
  materials: Commodity[]
  prices: PriceRow[]

  ships: Vehicle[]
  fleetIds: Set<number>
  scuOf: (v: Vehicle) => number
  terminals: Terminal[]
  distances: Map<number, number | null>
  prefs: SalvagePrefs
  onPrefs: (patch: Partial<SalvagePrefs>) => void
  now: number
}) {
  const { t } = useI18n()
  const byId = useMemo(() => new Map(materials.map((c) => [c.id, c])), [materials])
  const sorted = useMemo(() => [...ships].sort((a, b) => a.name_full.localeCompare(b.name_full)), [ships])
  const mine = sorted.filter((v) => fleetIds.has(v.id))
  const others = sorted.filter((v) => !fleetIds.has(v.id))
  const ship = ships.find((v) => v.id === prefs.shipId) ?? null
  const capacity = ship ? scuOf(ship) : 0
  const location = terminals.find((x) => x.id === prefs.locationId) ?? null
  const materialIds = useMemo(() => new Set(materials.map((c) => c.id)), [materials])
  const rows = useMemo(
    () => salvagePlan(prefs.cargo.filter((l) => materialIds.has(l.commodityId)), prices, (id) => distances.get(id) ?? null, prefs.sortBy),
    [prefs.cargo, prefs.sortBy, prices, distances, materialIds],
  )
  const setLine = (i: number, patch: Partial<{ commodityId: number; scu: number }>) => onPrefs({ cargo: prefs.cargo.map((l, j) => (j === i ? { ...l, ...patch } : l)) })
  const names = (ids: number[]) => ids.map((id) => byId.get(id)?.code ?? id).join(', ')
  const shipOption = (v: Vehicle) => (
    <option key={v.id} value={v.id}>
      {scuOf(v) > 0 ? `${v.name_full} · ${scuOf(v)} SCU` : v.name_full}
    </option>
  )

  return (
    <div className="stack">
      <Panel glow>
        <SectionLabel>Salvage Planner</SectionLabel>
        <div className="planner-grid">
          <div className="stack" style={{ gap: 8 }}>
            <label className="field">
              {t('routes.ship')}
              <select className="select" value={prefs.shipId ?? ''} onChange={(e) => onPrefs({ shipId: e.target.value ? Number(e.target.value) : null })}>
                <option value="">{t('salvage.noShip')}</option>
                {mine.length > 0 && <optgroup label={t('fleet.mine')}>{mine.map(shipOption)}</optgroup>}
                {mine.length > 0 ? <optgroup label={t('fleet.allShips')}>{others.map(shipOption)}</optgroup> : others.map(shipOption)}
              </select>
            </label>
            <div className="field">{t('planner.cargo')}</div>
            {prefs.cargo.map((l, i) => (
              <div className="row cargo-line" key={i}>
                <select className="select" aria-label={t('salvage.materialN', { n: i + 1 })} value={l.commodityId || ''} onChange={(e) => setLine(i, { commodityId: Number(e.target.value) })}>
                  <option value="">{t('salvage.pickMaterial')}</option>
                  {materials.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <ScuInput label={t('salvage.scuN', { n: i + 1 })} value={l.scu} onChange={(scu) => setLine(i, { scu })} />
                <button className="btn-link danger" onClick={() => onPrefs({ cargo: prefs.cargo.filter((_, j) => j !== i) })}>
                  {t('planner.remove')}
                </button>
              </div>
            ))}
            <div>
              <button className="btn" onClick={() => onPrefs({ cargo: [...prefs.cargo, { commodityId: 0, scu: 0 }] })}>
                {t('salvage.addMaterial')}
              </button>
            </div>
          </div>
          <div className="stack" style={{ gap: 8 }}>
            <label className="field">{t('planner.location')}</label>
            <SearchPicker
              items={terminals}
              ariaLabel={t('planner.location')}
              value={location}
              label={(x) => x.displayname}
              text={(x) => `${x.displayname} ${x.name} ${placeName(x) ?? ''}`}
              sub={(x) => locationPath(x).join(' › ')}
              onPick={(x) => onPrefs({ locationId: x.id })}
            />
            {location && <p className="muted location-line">{locationPath(location).join(' › ')}</p>}
            <label className="field">
              {t('routes.sortBy')}
              <select className="select" value={prefs.sortBy} onChange={(e) => onPrefs({ sortBy: e.target.value as SalvagePrefs['sortBy'] })}>
                <option value="value">{t('salvage.sortValue')}</option>
                <option value="distance">{t('planner.sortDistance')}</option>
              </select>
            </label>
          </div>
        </div>
        {capacityWarning(prefs.cargo, capacity) && <p className="warn">{t('salvage.overCapacity', { scu: capacity })}</p>}
      </Panel>

      {rows.length === 0 ? (
        <p className="muted">{t('salvage.empty')}</p>
      ) : (
        <Panel>
          <DataTable
            rows={rows}
            rowKey={(r) => r.terminalId}
            columns={[
              { key: 't', header: t('col.terminal'), render: (r) => <TerminalName id={r.terminalId} fallback={r.terminalName} /> },
              { key: 'v', header: t('salvage.value'), align: 'right', render: (r) => <b className="num">{formatAuec(r.value)} aUEC</b> },
              {
                key: 'p',
                header: t('col.price'),
                render: (r) => r.rows.map((p) => `${byId.get(p.id_commodity)?.code ?? ''} ${formatAuec(p.price_sell)}`).join(' · '),
              },
              { key: 'd', header: t('planner.distance'), align: 'right', render: (r) => (r.distance === null ? <span className="muted">—</span> : `${formatAuec(r.distance)} Gm`) },
              {
                key: 'u',
                header: t('common.updated'),
                render: (r) => <FreshnessBadge dateModifiedSec={Math.min(...r.rows.map((p) => p.date_modified))} now={now} />,
              },
              {
                key: 'w',
                header: '',
                render: (r) => (
                  <>
                    {r.short.length > 0 && <div className="warn">{t('salvage.short', { list: names(r.short) })}</div>}
                    {r.missing.length > 0 && <div className="muted">{t('salvage.missing', { list: names(r.missing) })}</div>}
                  </>
                ),
              },
            ]}
          />
        </Panel>
      )}
    </div>
  )
}

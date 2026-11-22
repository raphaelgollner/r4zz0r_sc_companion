import { useMemo } from 'react'
import { QUERY_TTL } from '../../data/ttl'
import type { Item, ItemPrice, Vehicle } from '../../data/types'
import { useUexQuery } from '../../data/useUex'
import { useWikiItems, useWikiVehicle } from '../../data/useWiki'
import type { FleetEntry } from '../../domain/fleet'
import { formatAuec } from '../../domain/format'
import { applyBuild, buildsFor, childPorts, cleanItems, fits, functionsOf, industrialSlots, pruneSetup, setupCost, type SetupFunction } from '../../domain/setup'
import type { WikiItem, WikiPort } from '../../domain/wiki'
import { useI18n } from '../../i18n/i18n'
import { SectionLabel } from '../../ui/components'
import { Dialog } from '../../ui/Dialog'
import { formatUsd } from './FleetView'

const UEX_CATEGORIES: Record<SetupFunction, number[]> = { mining: [29, 30], salvage: [31, 110], tractor: [67] }

const pct = (n: number) => `${n > 0 ? '+' : ''}${Math.round(n * 10) / 10}%`
const STAT_LABEL: Record<string, (n: number) => string> = {
  power_max: (n) => `Power ${formatAuec(n)}`,
  laser_instability: (n) => `Instability ${pct(n)}`,
  optimal_charge_window_size: (n) => `Window ${pct(n)}`,
  resistance: (n) => `Resistance ${pct(n)}`,
  module_slots: (n) => `${n} slots`,
  power_modifier: (n) => `Power ${pct(n * 100)}`,
  salvage_speed: (n) => `Speed ×${n}`,
  extraction_efficiency: (n) => `Efficiency ×${n}`,
}

const statsText = (i: WikiItem) =>
  Object.entries(STAT_LABEL)
    .filter(([k]) => i.stats[k] !== undefined)
    .map(([k, f]) => f(i.stats[k]))
    .join(' · ')

export function SetupDialog({
  entry,
  vehicle,
  usd,
  onUpdate,
  onClose,
}: {
  entry: FleetEntry
  vehicle: Vehicle
  usd: number | null
  onUpdate: (patch: Partial<Omit<FleetEntry, 'id'>>) => void
  onClose: () => void
}) {
  const { t } = useI18n()
  const wiki = useWikiVehicle(vehicle.uuid ?? null)
  const v = wiki.data
  const fns = useMemo(() => (v ? functionsOf(v) : []), [v])
  const has = (f: SetupFunction) => fns.includes(f)

  const mining = has('mining')
  const salvage = has('salvage')
  const tractor = has('tractor')
  const cat = (on: boolean, id: number) => (on ? { id_category: id } : null)

  const wLaser = useWikiItems(mining ? 'WeaponMining' : null)
  const wModule = useWikiItems(mining ? 'MiningModifier' : null)
  const wHead = useWikiItems(salvage ? 'SalvageHead' : null)
  const wScraper = useWikiItems(salvage ? 'SalvageModifier' : null)
  const wTractor = useWikiItems(tractor ? 'TractorBeam' : null)
  const uLaser = useUexQuery<Item[]>('items', cat(mining, UEX_CATEGORIES.mining[0]), QUERY_TTL.items)
  const uModule = useUexQuery<Item[]>('items', cat(mining, UEX_CATEGORIES.mining[1]), QUERY_TTL.items)
  const uScraper = useUexQuery<Item[]>('items', cat(salvage, UEX_CATEGORIES.salvage[0]), QUERY_TTL.items)
  const uBeam = useUexQuery<Item[]>('items', cat(salvage, UEX_CATEGORIES.salvage[1]), QUERY_TTL.items)
  const uTractor = useUexQuery<Item[]>('items', cat(tractor, UEX_CATEGORIES.tractor[0]), QUERY_TTL.items)
  const pLaser = useUexQuery<ItemPrice[]>('items_prices', cat(mining, UEX_CATEGORIES.mining[0]), QUERY_TTL.items_prices)
  const pModule = useUexQuery<ItemPrice[]>('items_prices', cat(mining, UEX_CATEGORIES.mining[1]), QUERY_TTL.items_prices)
  const pScraper = useUexQuery<ItemPrice[]>('items_prices', cat(salvage, UEX_CATEGORIES.salvage[0]), QUERY_TTL.items_prices)
  const pBeam = useUexQuery<ItemPrice[]>('items_prices', cat(salvage, UEX_CATEGORIES.salvage[1]), QUERY_TTL.items_prices)
  const pTractor = useUexQuery<ItemPrice[]>('items_prices', cat(tractor, UEX_CATEGORIES.tractor[0]), QUERY_TTL.items_prices)
  const wikiLists = [wLaser, wModule, wHead, wScraper, wTractor]

  const uexByUuid = useMemo(() => {
    const m = new Map<string, Item>()
    for (const list of [uLaser.data, uModule.data, uScraper.data, uBeam.data, uTractor.data]) for (const i of list ?? []) if (i.uuid) m.set(i.uuid, i)
    return m
  }, [uLaser.data, uModule.data, uScraper.data, uBeam.data, uTractor.data])
  const prices = useMemo(
    () => [pLaser.data, pModule.data, pScraper.data, pBeam.data, pTractor.data].flatMap((l) => l ?? []),
    [pLaser.data, pModule.data, pScraper.data, pBeam.data, pTractor.data],
  )
  const slots = useMemo(() => (v ? industrialSlots(v) : []), [v])

  const stock = useMemo(() => {
    const s = new Set<string>()
    const walk = (ports: WikiPort[]) => ports.forEach((p) => (p.equippedUuid && s.add(p.equippedUuid), walk(p.ports)))
    if (v) walk(v.ports)
    return s
  }, [v])
  const items = useMemo(
    () => cleanItems([wLaser.data, wModule.data, wHead.data, wScraper.data, wTractor.data].flatMap((l) => l ?? []), stock, uexByUuid),
    [wLaser.data, wModule.data, wHead.data, wScraper.data, wTractor.data, stock, uexByUuid],
  )
  const itemMap = useMemo(() => new Map(items.map((i) => [i.uuid, i])), [items])
  const builds = useMemo(() => (v ? buildsFor(v, items, vehicle.id, uexByUuid) : []), [v, items, vehicle.id, uexByUuid])
  const cost = setupCost(entry.setup, uexByUuid, prices)
  const loadingItems = wikiLists.some((l) => l.loading && !l.data)
  const itemsFailed = wikiLists.some((l) => l.error && !l.data)

  const locked = loadingItems || itemsFailed

  const save = (setup: Record<string, string>) => onUpdate({ setup: v ? pruneSetup(setup, v, itemMap) : setup })
  const choose = (port: WikiPort, uuid: string) => {
    const next = { ...entry.setup }
    if (!uuid || uuid === port.equippedUuid) delete next[port.path]
    else next[port.path] = uuid
    save(next)
  }

  const slotSelect = (port: WikiPort, label: string, allowEmpty: boolean) => {
    const cands = items.filter((i) => fits(i, port, vehicle.id, uexByUuid)).sort((a, b) => a.name.localeCompare(b.name))
    const value = entry.setup[port.path] ?? port.equippedUuid ?? ''
    const stockMissing = port.equippedUuid && !cands.some((c) => c.uuid === port.equippedUuid)

    const savedMissing = !!value && value !== port.equippedUuid && !cands.some((c) => c.uuid === value)
    return (
      <label className="field setup-slot" key={port.path}>
        {label}
        <select className="select" aria-label={label} value={value} disabled={locked} onChange={(e) => choose(port, e.target.value)}>
          {(value === '' || (allowEmpty && !port.equippedUuid)) && <option value="">{t('setup.empty')}</option>}
          {savedMissing && <option value={value}>{itemMap.get(value)?.name ?? t('setup.savedItem')}</option>}
          {stockMissing && (
            <option value={port.equippedUuid!}>
              {port.equippedName} ({t('setup.stock')})
            </option>
          )}
          {cands.map((c) => (
            <option key={c.uuid} value={c.uuid}>
              {c.name}
              {c.uuid === port.equippedUuid ? ` (${t('setup.stock')})` : ''}
              {c.active ? ` · ${t('setup.active')}` : ''} · S{c.size}
              {statsText(c) ? ` · ${statsText(c)}` : ''}
            </option>
          ))}
        </select>
      </label>
    )
  }

  const ref = usd === null && v?.msrp ? v.msrp : null

  return (
    <Dialog title={entry.nickname ? `${entry.nickname} · ${vehicle.name_full}` : vehicle.name_full} onClose={onClose}>
      {!vehicle.uuid ? (
        <p className="warn">{t('setup.noUuid')}</p>
      ) : wiki.error && !v ? (
        <div className="stack" style={{ gap: 8 }}>
          <p className="warn">{t('setup.wikiError')}</p>
          <div>
            <button className="btn" onClick={wiki.refresh}>
              {t('common.refresh')}
            </button>
          </div>
        </div>
      ) : !v ? (
        <p className="muted">{t('setup.loading')}</p>
      ) : (
        <div className="stack setup-dialog">
          <p>
            {v.role && <span className="chip">{v.role}</span>}
            {ref !== null && (
              <span className="muted">
                {' '}
                {formatUsd(ref)} · {t('setup.refPrice')}
              </span>
            )}
          </p>
          {v.description && <p className="muted setup-desc">{v.description}</p>}

          {slots.length === 0 ? (
            <p className="muted">{t('setup.noIndustrial')}</p>
          ) : (
            <>
              {builds.length > 0 && (
                <>
                  <SectionLabel>{t('setup.builds')}</SectionLabel>
                  <div className="build-list">
                    {builds.map((b) => (
                      <div className="build" key={b.id}>
                        <b>{t(b.nameKey as never)}</b>
                        <span className="muted">{t(b.criterionKey as never)}</span>
                        <button className="btn" aria-label={`${t('setup.apply')} ${t(b.nameKey as never)}`} onClick={() => v && save(applyBuild(entry.setup, b, v))} disabled={locked}>
                          {t('setup.apply')}
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
              <SectionLabel>{t('setup.slots')}</SectionLabel>
              {loadingItems && <p className="muted">{t('setup.loadingItems')}</p>}
              {itemsFailed && (
                <div className="row">
                  <span className="warn">{t('setup.itemsError')}</span>
                  <button className="btn" onClick={() => wikiLists.forEach((l) => l.error && l.refresh())}>
                    {t('common.refresh')}
                  </button>
                </div>
              )}
              {slots.map((s) => (
                <div className="setup-group" key={s.port.path}>
                  {slotSelect(s.port, s.label, false)}
                  {childPorts(s.port, entry.setup, itemMap).map((c, i) => slotSelect(c, `${s.label} · ${t('setup.module', { n: i + 1 })}`, true))}
                </div>
              ))}
              <div className="row setup-footer">
                <span data-testid="setup-cost">
                  {t('setup.cost')}: <b className="num">{formatAuec(cost.total)} aUEC</b>
                  {cost.missing > 0 && <span className="warn"> · {t('setup.noPrice', { n: cost.missing })}</span>}
                </span>
                <button className="btn-link" disabled={locked} onClick={() => onUpdate({ setup: {} })}>
                  {t('setup.reset')}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </Dialog>
  )
}

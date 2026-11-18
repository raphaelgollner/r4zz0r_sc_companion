import { useMemo } from 'react'
import { QUERY_TTL } from '../../data/ttl'
import type { Item, ItemPrice, Vehicle } from '../../data/types'
import { useUexQuery } from '../../data/useUex'
import { useWikiItems, useWikiVehicle } from '../../data/useWiki'
import type { FleetEntry } from '../../domain/fleet'
import { formatAuec } from '../../domain/format'
import { buildsFor, childPorts, fits, functionsOf, industrialSlots, pruneSetup, setupCost, type SetupFunction } from '../../domain/setup'
import type { WikiItem, WikiPort } from '../../domain/wiki'
import { useI18n } from '../../i18n/i18n'
import { SectionLabel } from '../../ui/components'
import { Dialog } from '../../ui/Dialog'
import { formatUsd } from './FleetView'

/** Categorias do UEX com preço dos itens de cada função (lasers, módulos, scraper, tractor, salvage beams). */
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
/** Resumo dos atributos principais (nomes como no jogo, em inglês). */
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

  // Número fixo de consultas; as de funções que a nave não tem ficam desligadas.
  const wikiLists = [
    useWikiItems(has('mining') ? 'WeaponMining' : null),
    useWikiItems(has('mining') ? 'MiningModifier' : null),
    useWikiItems(has('salvage') ? 'SalvageHead' : null),
    useWikiItems(has('salvage') ? 'SalvageModifier' : null),
    useWikiItems(has('tractor') ? 'TractorBeam' : null),
  ]
  const cats = (Object.keys(UEX_CATEGORIES) as SetupFunction[]).flatMap((f) => UEX_CATEGORIES[f].map((c) => ({ f, c })))
  const uexItems = cats.map(({ f, c }) => useUexQuery<Item[]>('items', has(f) ? { id_category: c } : null, QUERY_TTL.items))
  const uexPrices = cats.map(({ f, c }) => useUexQuery<ItemPrice[]>('items_prices', has(f) ? { id_category: c } : null, QUERY_TTL.items_prices))

  const items = useMemo(() => wikiLists.flatMap((l) => l.data ?? []), wikiLists.map((l) => l.data)) // eslint-disable-line react-hooks/exhaustive-deps
  const itemMap = useMemo(() => new Map(items.map((i) => [i.uuid, i])), [items])
  const uexByUuid = useMemo(() => {
    const m = new Map<string, Item>()
    for (const q of uexItems) for (const i of q.data ?? []) if (i.uuid) m.set(i.uuid, i)
    return m
  }, uexItems.map((q) => q.data)) // eslint-disable-line react-hooks/exhaustive-deps
  const prices = useMemo(() => uexPrices.flatMap((q) => q.data ?? []), uexPrices.map((q) => q.data)) // eslint-disable-line react-hooks/exhaustive-deps

  const slots = useMemo(() => (v ? industrialSlots(v) : []), [v])
  const builds = useMemo(() => (v ? buildsFor(v, items, vehicle.id, uexByUuid) : []), [v, items, vehicle.id, uexByUuid])
  const cost = setupCost(entry.setup, uexByUuid, prices)
  const loadingItems = wikiLists.some((l) => l.loading && !l.data)

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
    return (
      <label className="field setup-slot" key={port.path}>
        {label}
        <select className="select" aria-label={label} value={value} onChange={(e) => choose(port, e.target.value)}>
          {allowEmpty && !port.equippedUuid && <option value="">{t('setup.empty')}</option>}
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
                        <button className="btn" aria-label={`${t('setup.apply')} ${t(b.nameKey as never)}`} onClick={() => save(b.setup)} disabled={loadingItems}>
                          {t('setup.apply')}
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
              <SectionLabel>{t('setup.slots')}</SectionLabel>
              {loadingItems && <p className="muted">{t('setup.loadingItems')}</p>}
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
                <button className="btn-link" onClick={() => onUpdate({ setup: {} })}>
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

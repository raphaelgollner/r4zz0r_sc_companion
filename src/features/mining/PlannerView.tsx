import { useEffect, useMemo, useState } from 'react'
import type { Commodity, PriceRow, RawPriceRow, RefineryYield, Terminal } from '../../data/types'
import { formatAuec } from '../../domain/format'
import { locationPath, placeName } from '../../domain/location'
import { refinedOf, refinePlan, refineryMatrix, sellRawValue } from '../../domain/mining'
import { useI18n } from '../../i18n/i18n'
import type { MinerPrefs } from '../../store/minerPrefs'
import { DataTable, Panel, SectionLabel } from '../../ui/components'
import { TerminalName } from '../../ui/TerminalName'

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Campo de busca genérico com lista de opções. */
function SearchPicker<T>({
  items,
  label,
  value,
  onPick,
  text,
  sub,
  ariaLabel,
}: {
  items: T[]
  label: (x: T) => string
  value: T | null
  onPick: (x: T) => void
  text: (x: T) => string
  sub?: (x: T) => string | null
  ariaLabel: string
}) {
  const [q, setQ] = useState('')
  const opts = useMemo(() => (q.trim() ? items.filter((x) => norm(text(x)).includes(norm(q.trim()))).slice(0, 12) : []), [items, q, text])
  return (
    <div className="picker">
      <input className="input" role="combobox" aria-label={ariaLabel} aria-expanded={opts.length > 0} placeholder={value ? label(value) : '…'} value={q} onChange={(e) => setQ(e.target.value)} />
      {opts.length > 0 && (
        <ul className="picker-list" role="listbox">
          {opts.map((x, i) => (
            <li
              key={i}
              role="option"
              aria-selected={x === value}
              onClick={() => {
                onPick(x)
                setQ('')
              }}
            >
              {label(x)} {sub?.(x) && <span className="muted">{sub(x)}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** SCU com decimal: mantém o texto enquanto digita ("3," / "3,5") e só reformata ao sair do campo. */
function ScuInput({ label, value, onChange }: { label: string; value: number; onChange: (scu: number) => void }) {
  const show = (v: number) => (v > 0 ? String(v).replace('.', ',') : '')
  const [text, setText] = useState(show(value))
  const [focused, setFocused] = useState(false)
  useEffect(() => {
    if (!focused) setText(show(value))
  }, [value, focused])
  return (
    <input
      className="input num"
      style={{ width: 100, minWidth: 80 }}
      inputMode="decimal"
      aria-label={label}
      value={text}
      placeholder="SCU"
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={(e) => {
        setText(e.target.value)
        const n = Number(e.target.value.trim().replace(',', '.'))
        onChange(Number.isFinite(n) && n > 0 ? n : 0)
      }}
    />
  )
}

export function PlannerView({
  commodities,
  yields,
  prices,
  rawPrices,
  terminals,
  distances,
  prefs,
  onPrefs,
}: {
  commodities: Commodity[]
  yields: RefineryYield[]
  prices: PriceRow[]
  rawPrices: RawPriceRow[]
  terminals: Terminal[]
  distances: Map<number, number | null>
  prefs: MinerPrefs
  onPrefs: (patch: Partial<MinerPrefs>) => void
  now: number
}) {
  const { t } = useI18n()
  const m = useMemo(() => refineryMatrix(yields), [yields])
  const byId = useMemo(() => new Map(commodities.map((c) => [c.id, c])), [commodities])
  const ores = useMemo(() => m.ores.map((o) => byId.get(o.id)).filter((c): c is Commodity => !!c), [m, byId])
  const location = terminals.find((x) => x.id === prefs.locationId) ?? null

  const refinedPrice = useMemo(() => {
    const cache = new Map<number, number | null>()
    return (oreId: number) => {
      if (cache.has(oreId)) return cache.get(oreId)!
      const ore = byId.get(oreId)
      const refined = ore ? refinedOf(ore, commodities) : null
      let best: number | null = null
      if (refined) for (const p of prices) if (p.id_commodity === refined.id && p.price_sell > 0 && (best === null || p.price_sell > best)) best = p.price_sell
      cache.set(oreId, best)
      return best
    }
  }, [byId, commodities, prices])

  const bestRaw = useMemo(() => {
    const best = new Map<number, number>()
    for (const p of rawPrices) if (p.price_sell > 0 && p.price_sell > (best.get(p.id_commodity) ?? 0)) best.set(p.id_commodity, p.price_sell)
    return (oreId: number) => best.get(oreId) ?? null
  }, [rawPrices])

  const rows = useMemo(
    () => refinePlan(prefs.cargo, yields, refinedPrice, (id) => distances.get(id) ?? null, m.terminals, prefs.sortBy),
    [prefs.cargo, prefs.sortBy, yields, refinedPrice, distances, m.terminals],
  )
  const rawValue = sellRawValue(prefs.cargo, bestRaw)

  const setLine = (i: number, patch: Partial<{ oreId: number; scu: number }>) =>
    onPrefs({ cargo: prefs.cargo.map((l, j) => (j === i ? { ...l, ...patch } : l)) })

  return (
    <div className="stack">
      <Panel glow>
        <SectionLabel>Refine Planner</SectionLabel>
        <div className="planner-grid">
          <div className="stack" style={{ gap: 8 }}>
            <div className="field">{t('planner.cargo')}</div>
            {prefs.cargo.map((l, i) => (
              <div className="row cargo-line" key={i}>
                <SearchPicker
                  items={ores}
                  ariaLabel={t('planner.oreN', { n: i + 1 })}
                  value={byId.get(l.oreId) ?? null}
                  label={(c) => c.name}
                  text={(c) => `${c.name} ${c.code}`}
                  onPick={(c) => setLine(i, { oreId: c.id })}
                />
                <ScuInput label={t('planner.scuN', { n: i + 1 })} value={l.scu} onChange={(scu) => setLine(i, { scu })} />
                <button className="btn-link danger" onClick={() => onPrefs({ cargo: prefs.cargo.filter((_, j) => j !== i) })}>
                  {t('planner.remove')}
                </button>
              </div>
            ))}
            <div>
              <button className="btn" onClick={() => onPrefs({ cargo: [...prefs.cargo, { oreId: 0, scu: 0 }] })}>
                {t('planner.addOre')}
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
              <select className="select" value={prefs.sortBy} onChange={(e) => onPrefs({ sortBy: e.target.value as MinerPrefs['sortBy'] })}>
                <option value="value">{t('planner.sortValue')}</option>
                <option value="distance">{t('planner.sortDistance')}</option>
              </select>
            </label>
          </div>
        </div>
        <p className="muted estimate-note">{t('planner.estimateNote')}</p>
      </Panel>

      {rows.length === 0 ? (
        <p className="muted">{t('planner.empty')}</p>
      ) : (
        <>
          <div className="sell-raw" data-testid="sell-raw">
            {t('planner.sellRaw')}: <b className="num">≈ {formatAuec(rawValue)} aUEC</b>
          </div>
          <Panel>
            <DataTable
              rows={rows}
              rowKey={(r) => r.terminalId}
              columns={[
                { key: 'ref', header: t('mining.refinery'), render: (r) => <TerminalName id={r.terminalId} fallback={r.terminalName} /> },
                {
                  key: 'bonus',
                  header: t('planner.avgBonus'),
                  align: 'right',
                  render: (r) => <span className={r.avgBonus > 0 ? 'profit' : r.avgBonus < 0 ? 'loss' : 'muted'}>{r.avgBonus.toFixed(1).replace('.', ',')}%</span>,
                },
                { key: 'value', header: t('planner.estValue'), align: 'right', render: (r) => <b className="num">≈ {formatAuec(r.estValue)} aUEC</b> },
                {
                  key: 'dist',
                  header: t('planner.distance'),
                  align: 'right',
                  render: (r) => (r.distance === null ? <span className="muted">—</span> : `${formatAuec(r.distance)} Gm`),
                },
                {
                  key: 'warn',
                  header: '',
                  render: (r) =>
                    r.missingPrice.length > 0 ? (
                      <span className="warn">{t('planner.noPrice', { ores: r.missingPrice.map((id) => byId.get(id)?.name ?? id).join(', ') })}</span>
                    ) : null,
                },
              ]}
            />
          </Panel>
        </>
      )}
    </div>
  )
}

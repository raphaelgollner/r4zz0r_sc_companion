import { useMemo, useState } from 'react'
import type { Item, ItemAttribute, ItemPrice } from '../../data/types'
import { formatAuec } from '../../domain/format'
import { attr } from '../../domain/mining'
import { useI18n } from '../../i18n/i18n'
import { DataTable, FreshnessBadge, Panel, SectionLabel, Tabs, type Column } from '../../ui/components'
import { Dialog } from '../../ui/Dialog'
import { TerminalName } from '../../ui/TerminalName'
import { Tooltip } from '../../ui/Tooltip'
import { ItemStoreDialog } from './ItemStoreDialog'

export type EquipmentKind = 'lasers' | 'modules' | 'gadgets'
export const EQUIPMENT_CATEGORY: Record<EquipmentKind, number> = { lasers: 29, modules: 30, gadgets: 28 }

/** Atributos de laser que viram colunas (nomes como no jogo). */
const LASER_COLUMNS = [
  'Mining Laser Power',
  'Extraction Laser Power',
  'Optimal Range',
  'Laser Instability',
  'Resistance',
  'Inert Material Level',
  'Optimal Charge Window Size',
  'Module Slots',
]
const HIDDEN = new Set(['Volume', 'Size', 'Item Type'])
const MAX_COMPARE = 3
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function EquipmentView({
  kind,
  onKind,
  items,
  attrs,
  prices,
  now,
}: {
  kind: EquipmentKind
  onKind: (k: EquipmentKind) => void
  items: Item[]
  attrs: ItemAttribute[]
  prices: ItemPrice[]
  now: number
}) {
  const { t } = useI18n()
  const [query, setQuery] = useState('')
  const [size, setSize] = useState('')
  const [compare, setCompare] = useState<number[]>([])
  const [showCompare, setShowCompare] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [store, setStore] = useState<{ id: number; name: string } | null>(null)

  const offers = useMemo(() => {
    const m = new Map<number, ItemPrice[]>()
    for (const p of prices) if (p.price_buy > 0) m.set(p.id_item, [...(m.get(p.id_item) ?? []), p])
    m.forEach((list) => list.sort((a, b) => a.price_buy - b.price_buy))
    return m
  }, [prices])

  const sizes = useMemo(() => [...new Set(items.map((i) => i.size).filter((s): s is string => !!s))].sort(), [items])
  const rows = useMemo(
    () =>
      items.filter(
        (i) =>
          (!query.trim() || norm(`${i.name} ${i.company_name ?? ''}`).includes(norm(query.trim()))) && (!size || i.size === size),
      ),
    [items, query, size],
  )
  const effects = (id: number) =>
    attrs
      .filter((a) => a.id_item === id && a.value && !HIDDEN.has(a.attribute_name))
      .map((a) => `${a.attribute_name}: ${a.value}${a.unit ? ` ${a.unit}` : ''}`)
  const attrNames = kind === 'lasers' ? LASER_COLUMNS : [...new Set(attrs.filter((a) => a.value && !HIDDEN.has(a.attribute_name)).map((a) => a.attribute_name))]
  const dash = <span className="muted">—</span>
  const selected = items.find((i) => i.id === selectedId) ?? null

  const columns: Column<Item>[] = [
    {
      key: 'cmp',
      header: '',
      render: (i) => (
        <input
          type="checkbox"
          aria-label={t('equip.compareOf', { name: i.name })}
          checked={compare.includes(i.id)}
          disabled={!compare.includes(i.id) && compare.length >= MAX_COMPARE}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => setCompare((c) => (e.target.checked ? [...c, i.id] : c.filter((x) => x !== i.id)))}
        />
      ),
    },
    { key: 'name', header: t('equip.item'), render: (i) => i.name, sortValue: (i) => i.name },
    { key: 'maker', header: t('ships.col.maker'), render: (i) => i.company_name ?? '—', sortValue: (i) => i.company_name ?? '' },
    { key: 'size', header: t('equip.size'), render: (i) => i.size || dash, sortValue: (i) => i.size ?? '' },
  ]
  if (kind === 'lasers')
    for (const name of LASER_COLUMNS)
      columns.push({ key: name, header: name, align: 'right', render: (i) => attr(attrs, i.id, name) ?? dash })
  else {
    columns.push({ key: 'type', header: t('equip.type'), render: (i) => attr(attrs, i.id, 'Item Type') ?? dash })
    columns.push({
      key: 'fx',
      header: t('equip.effects'),
      render: (i) => {
        const fx = effects(i.id)
        return fx.length ? <Tooltip content={fx.join(' · ')}>{fx.slice(0, 2).join(' · ') + (fx.length > 2 ? ' …' : '')}</Tooltip> : dash
      },
    })
  }
  columns.push(
    {
      key: 'price',
      header: t('equip.minPrice'),
      align: 'right',
      render: (i) => (offers.get(i.id)?.[0] ? formatAuec(offers.get(i.id)![0].price_buy) : <span className="muted">{t('equip.notSold')}</span>),
      sortValue: (i) => offers.get(i.id)?.[0]?.price_buy ?? Number.MAX_SAFE_INTEGER,
    },
    { key: 'stores', header: t('equip.stores'), align: 'right', render: (i) => offers.get(i.id)?.length ?? 0 },
  )

  return (
    <div className="stack">
      <Panel>
        <Tabs
          sub
          items={[
            { key: 'lasers' as EquipmentKind, label: t('equip.lasers') },
            { key: 'modules' as EquipmentKind, label: t('equip.modules') },
            { key: 'gadgets' as EquipmentKind, label: t('equip.gadgets') },
          ]}
          active={kind}
          onChange={(k) => {
            onKind(k)
            setCompare([])
            setSelectedId(null)
          }}
        />
        <div className="row" style={{ marginBottom: 12 }}>
          <input className="input" placeholder={t('common.search')} value={query} onChange={(e) => setQuery(e.target.value)} />
          <label className="field">
            {t('equip.size')}
            <select className="select" value={size} onChange={(e) => setSize(e.target.value)}>
              <option value="">{t('equip.allSizes')}</option>
              {sizes.map((s) => (
                <option key={s} value={s}>
                  S{s}
                </option>
              ))}
            </select>
          </label>
          <button className="btn" disabled={compare.length < 2} onClick={() => setShowCompare(true)}>
            {t('equip.compare', { n: compare.length })}
          </button>
        </div>
        <DataTable rows={rows} columns={columns} rowKey={(i) => i.id} selectedKey={selectedId} onRowClick={(i) => setSelectedId(i.id)} initialSort={{ key: 'name', dir: 'asc' }} />
      </Panel>

      {selected && (
        <Panel title={selected.name} glow>
          <SectionLabel>{t('ships.whereBuy')}</SectionLabel>
          <DataTable
            rows={offers.get(selected.id) ?? []}
            rowKey={(o) => o.id}
            empty={t('equip.notSold')}
            columns={[
              {
                key: 't',
                header: t('col.terminal'),
                render: (o) => (
                  <button className="link-cell" onClick={() => setStore({ id: o.id_terminal, name: o.terminal_name })}>
                    <TerminalName id={o.id_terminal} fallback={o.terminal_name} />
                  </button>
                ),
              },
              { key: 'p', header: t('col.price'), align: 'right', render: (o) => `${formatAuec(o.price_buy)} aUEC` },
              { key: 'u', header: t('common.updated'), render: (o) => <FreshnessBadge dateModifiedSec={o.date_modified} now={now} /> },
            ]}
          />
        </Panel>
      )}

      {showCompare && (
        <Dialog title={t('equip.compareTitle')} onClose={() => setShowCompare(false)}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t('equip.attribute')}</th>
                  {compare.map((id) => (
                    <th key={id}>{items.find((i) => i.id === id)?.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[t('equip.size'), ...attrNames, t('equip.minPrice')].map((name, idx) => (
                  <tr key={name}>
                    <td>{name}</td>
                    {compare.map((id) => {
                      const it = items.find((i) => i.id === id)
                      const v =
                        idx === 0 ? it?.size : name === t('equip.minPrice') ? (offers.get(id)?.[0] ? formatAuec(offers.get(id)![0].price_buy) : null) : attr(attrs, id, name)
                      return <td key={id}>{v || '—'}</td>
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Dialog>
      )}

      {store && <ItemStoreDialog terminalId={store.id} terminalName={store.name} items={items} prices={prices} now={now} onClose={() => setStore(null)} />}
    </div>
  )
}

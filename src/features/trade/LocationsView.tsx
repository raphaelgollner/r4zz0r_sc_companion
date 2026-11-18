import { useMemo, useState } from 'react'
import type { PriceRow, Terminal } from '../../data/types'
import { buildLocationTree, type LocationNode } from '../../domain/locations'
import { useI18n } from '../../i18n/i18n'
import { Panel, SectionLabel } from '../../ui/components'
import { locationPath } from '../../domain/location'
import { PriceTable } from './shared'

function Node({
  node,
  depth,
  selectedId,
  onPick,
}: {
  node: LocationNode
  depth: number
  selectedId: number | null
  onPick: (t: Terminal) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <li>
      <button className="tree-node" style={{ paddingLeft: depth * 16 }} aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="tree-caret">{open ? '▾' : '▸'}</span> {node.label}
      </button>
      {open && (
        <ul className="tree">
          {node.children.map((c) => (
            <Node key={c.label} node={c} depth={depth + 1} selectedId={selectedId} onPick={onPick} />
          ))}
          {node.terminals.map((t) => (
            <li key={t.id}>
              <button
                className="tree-leaf"
                style={{ paddingLeft: (depth + 1) * 16 + 14 }}
                aria-current={t.id === selectedId || undefined}
                title={locationPath(t).join(' › ')}
                onClick={() => onPick(t)}
              >
                {t.displayname}
              </button>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

export function LocationsView({ terminals, prices, now }: { terminals: Terminal[]; prices: PriceRow[]; now: number }) {
  const { t } = useI18n()
  const tree = useMemo(() => buildLocationTree(terminals, undefined, t('locations.deepSpace')), [terminals, t])
  const [selected, setSelected] = useState<Terminal | null>(null)
  const rows = useMemo(() => (selected ? prices.filter((p) => p.id_terminal === selected.id) : []), [prices, selected])

  return (
    <div className="grid-2">
      <Panel>
        <SectionLabel>{t('locations.title')}</SectionLabel>
        <ul className="tree">
          {tree.map((n) => (
            <Node key={n.label} node={n} depth={0} selectedId={selected?.id ?? null} onPick={setSelected} />
          ))}
        </ul>
      </Panel>
      <div role="region" aria-label={selected?.displayname ?? t('locations.title')}>
        <Panel title={selected?.displayname ?? t('locations.title')} glow>
          {!selected ? (
            <p className="muted">{t('locations.pick')}</p>
          ) : rows.length === 0 ? (
            <p className="muted">{t('locations.noTrade')}</p>
          ) : (
            <PriceTable rows={rows} now={now} label="commodity" />
          )}
        </Panel>
      </div>
    </div>
  )
}

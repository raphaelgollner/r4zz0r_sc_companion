import { useMemo, useState } from 'react'
import type { RefineryCapacity, RefineryMethod, RefineryYield } from '../../data/types'
import { refineryMatrix } from '../../domain/mining'
import { useI18n } from '../../i18n/i18n'
import { DataTable, Panel, SectionLabel } from '../../ui/components'
import { TerminalName } from '../../ui/TerminalName'
import { Tooltip } from '../../ui/Tooltip'

function Bonus({ value }: { value: number | null }) {
  if (value === null) return <span className="muted">—</span>
  const text = value > 0 ? `+${value}%` : value < 0 ? `−${Math.abs(value)}%` : '0%'
  return <span className={value > 0 ? 'profit' : value < 0 ? 'loss' : 'muted'}>{text}</span>
}

export function RefineriesView({
  yields,
  capacities,
  methods,
}: {
  yields: RefineryYield[]
  capacities: RefineryCapacity[]
  methods: RefineryMethod[]
}) {
  const { t } = useI18n()
  const m = useMemo(() => refineryMatrix(yields), [yields])
  const [oreId, setOreId] = useState<number | null>(null)
  const capacity = useMemo(() => new Map(capacities.map((c) => [c.id_terminal, c.value])), [capacities])
  const ores = oreId === null ? m.ores : m.ores.filter((o) => o.id === oreId)
  const rating = (n: number) => t(`mining.rating${Math.min(3, Math.max(1, n)) as 1 | 2 | 3}`)

  return (
    <div className="stack">
      <Panel>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
          <SectionLabel>Refineries</SectionLabel>
          <label className="field">
            {t('mining.ore')}
            <select className="select" value={oreId ?? ''} onChange={(e) => setOreId(e.target.value ? Number(e.target.value) : null)}>
              <option value="">{t('mining.allOres')}</option>
              {m.ores.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <DataTable
          rows={m.terminals}
          rowKey={(r) => r.id}
          initialSort={oreId !== null ? { key: `o${oreId}`, dir: 'desc' } : { key: 'name', dir: 'asc' }}
          key={oreId ?? 'all'}
          columns={[
            { key: 'name', header: t('mining.refinery'), render: (r) => <TerminalName id={r.id} fallback={r.name} />, sortValue: (r) => r.name },
            {
              key: 'cap',
              header: t('mining.capacity'),
              align: 'right',
              render: (r) => (capacity.has(r.id) ? `${capacity.get(r.id)}%` : <span className="muted">—</span>),
              sortValue: (r) => capacity.get(r.id) ?? -1,
            },
            ...ores.map((o) => ({
              key: `o${o.id}`,
              header: o.name.replace(/ \((Raw|Ore)\)$/, ''),
              align: 'right' as const,
              render: (r: { id: number }) => (
                <Tooltip content={`${o.name} · ${t('mining.bonusHint')}`}>
                  <Bonus value={m.value(r.id, o.id)} />
                </Tooltip>
              ),
              sortValue: (r: { id: number }) => m.value(r.id, o.id) ?? -Infinity,
            })),
          ]}
        />
      </Panel>

      <Panel>
        <SectionLabel>{t('mining.methods')}</SectionLabel>
        <DataTable
          rows={methods}
          rowKey={(x) => x.id}
          initialSort={{ key: 'yield', dir: 'desc' }}
          columns={[
            { key: 'name', header: t('mining.method'), render: (x) => x.name, sortValue: (x) => x.name },
            { key: 'yield', header: t('mining.yield'), render: (x) => rating(x.rating_yield), sortValue: (x) => x.rating_yield },
            { key: 'cost', header: t('mining.cost'), render: (x) => rating(x.rating_cost), sortValue: (x) => x.rating_cost },
            { key: 'speed', header: t('mining.speed'), render: (x) => rating(x.rating_speed), sortValue: (x) => x.rating_speed },
          ]}
        />
      </Panel>
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import type { Terminal, Vehicle } from '../../data/types'
import { formatAuec, parseAmount } from '../../domain/format'
import { useI18n } from '../../i18n/i18n'
import { effectiveScu, type Prefs } from '../../store/prefs'

/** Texto de um campo numérico: mantém o que foi digitado e só reescreve quando o valor muda por fora. */
function useAmountText(value: number) {
  const [text, setText] = useState(value > 0 ? formatAuec(value) : '')
  useEffect(() => {
    const typed = parseAmount(text)
    if ((Number.isFinite(typed) ? typed : 0) !== value) setText(value > 0 ? formatAuec(value) : '')
    // só reage a mudanças externas do valor
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  return [text, setText] as const
}

export function RouteControls({
  vehicles,
  terminals,
  prefs,
  onPrefs,
  balance = null,
  compact = false,
}: {
  vehicles: Vehicle[]
  terminals: Terminal[]
  prefs: Prefs
  onPrefs: (patch: Partial<Prefs>) => void
  balance?: number | null
  compact?: boolean
}) {
  const { t } = useI18n()
  const ships = useMemo(() => [...vehicles].sort((a, b) => a.name_full.localeCompare(b.name_full)), [vehicles])
  const ship = vehicles.find((v) => v.id === prefs.shipId) ?? null
  const scu = effectiveScu(prefs, ship)
  const hasOverride = ship !== null && prefs.scuOverrides[ship.id] !== undefined
  const [budgetText, setBudgetText] = useAmountText(prefs.budget)
  const [scuText, setScuText] = useAmountText(scu)
  const systems = useMemo(
    () => [...new Set(terminals.map((x) => x.star_system_name).filter((s): s is string => !!s))].sort(),
    [terminals],
  )

  const setScu = (text: string) => {
    setScuText(text)
    if (!ship) return
    const n = parseAmount(text)
    onPrefs({ scuOverrides: { ...prefs.scuOverrides, [ship.id]: Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0 } })
  }
  const resetScu = () => {
    if (!ship) return
    const rest = { ...prefs.scuOverrides }
    delete rest[ship.id]
    onPrefs({ scuOverrides: rest })
  }

  return (
    <div className="row">
      <label className="field">
        {t('routes.ship')}
        <select
          className="select"
          value={prefs.shipId ?? ''}
          onChange={(e) => onPrefs({ shipId: e.target.value ? Number(e.target.value) : null })}
        >
          <option value="" disabled hidden>
            {t('routes.pickShip')}
          </option>
          {ships.map((v) => (
            <option key={v.id} value={v.id}>
              {v.scu > 0 ? `${v.name_full} · ${v.scu} SCU` : v.name_full}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        SCU
        <input
          className="input num"
          style={{ minWidth: 90, width: 110 }}
          inputMode="numeric"
          disabled={!ship}
          value={ship ? scuText : ''}
          onChange={(e) => setScu(e.target.value)}
        />
      </label>
      {hasOverride && (
        <button className="btn-link" onClick={resetScu}>
          ↺ {t('routes.resetScu', { scu: ship!.scu })}
        </button>
      )}
      <label className="field">
        {t('routes.budget')}
        <input
          className="input num"
          inputMode="numeric"
          value={budgetText}
          placeholder="0"
          onChange={(e) => {
            setBudgetText(e.target.value)
            const n = parseAmount(e.target.value)
            onPrefs({ budget: Number.isFinite(n) ? n : 0 })
          }}
        />
      </label>
      {balance !== null && (
        <button className="btn" onClick={() => onPrefs({ budget: Math.max(0, balance) })}>
          {t('routes.useBalance')}
        </button>
      )}
      {!compact && (
        <>
          <label className="field">
            {t('routes.originSystem')}
            <select className="select" value={prefs.originSystem} onChange={(e) => onPrefs({ originSystem: e.target.value })}>
              <option value="">{t('routes.anySystem')}</option>
              {systems.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            {t('routes.sortBy')}
            <select className="select" value={prefs.sortBy} onChange={(e) => onPrefs({ sortBy: e.target.value as Prefs['sortBy'] })}>
              <option value="profit">{t('routes.sortProfit')}</option>
              <option value="roi">{t('routes.sortRoi')}</option>
            </select>
          </label>
          <label className="check">
            <input type="checkbox" checked={prefs.excludeIllegal} onChange={(e) => onPrefs({ excludeIllegal: e.target.checked })} />
            {t('routes.excludeIllegal')}
          </label>
        </>
      )}
    </div>
  )
}

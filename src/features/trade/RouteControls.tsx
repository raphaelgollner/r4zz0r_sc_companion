import { useEffect, useMemo, useState } from 'react'
import type { Terminal, Vehicle } from '../../data/types'
import { formatAuec, parseAmount } from '../../domain/format'
import type { MaxRisk } from '../../domain/risk'
import { useFleet } from '../../store/fleet'
import { useI18n } from '../../i18n/i18n'
import { effectiveScu, type Prefs } from '../../store/prefs'
import { Tooltip } from '../../ui/Tooltip'
import { AvoidPicker } from './AvoidPicker'

/**
 * Texto de um campo numérico: enquanto o campo está em foco, mantém exatamente o que foi digitado;
 * fora de foco, mostra o valor salvo formatado.
 */
function useAmountText(value: number) {
  const fmt = (v: number) => (v > 0 ? formatAuec(v) : '')
  const [text, setText] = useState(fmt(value))
  const [focused, setFocused] = useState(false)
  useEffect(() => {
    if (!focused) setText(fmt(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, focused])
  const bind = { onFocus: () => setFocused(true), onBlur: () => setFocused(false) }
  return [text, setText, bind] as const
}

export function RouteControls({
  vehicles,
  terminals,
  prefs,
  onPrefs,
  balance = null,
}: {
  vehicles: Vehicle[]
  terminals: Terminal[]
  prefs: Prefs
  onPrefs: (patch: Partial<Prefs>) => void
  balance?: number | null
}) {
  const { t } = useI18n()
  const ships = useMemo(() => [...vehicles].sort((a, b) => a.name_full.localeCompare(b.name_full)), [vehicles])
  const { entries } = useFleet()
  const mineIds = useMemo(() => new Set(entries.map((e) => e.vehicleId)), [entries])
  const mine = useMemo(() => ships.filter((v) => mineIds.has(v.id)), [ships, mineIds])
  const others = useMemo(() => (mine.length ? ships.filter((v) => !mineIds.has(v.id)) : ships), [ships, mine, mineIds])
  const shipOption = (v: Vehicle) => (
    <option key={v.id} value={v.id}>
      {v.scu > 0 ? `${v.name_full} · ${v.scu} SCU` : v.name_full}
    </option>
  )
  const ship = vehicles.find((v) => v.id === prefs.shipId) ?? null
  const scu = effectiveScu(prefs, ship)
  const hasOverride = ship !== null && prefs.scuOverrides[ship.id] !== undefined
  const [budgetText, setBudgetText, budgetBind] = useAmountText(prefs.budget)
  const [scuText, setScuText, scuBind] = useAmountText(scu)
  const systems = useMemo(
    () => [...new Set(terminals.map((x) => x.star_system_name).filter((s): s is string => !!s))].sort(),
    [terminals],
  )

  const resetScu = () => {
    if (!ship) return
    const rest = { ...prefs.scuOverrides }
    delete rest[ship.id]
    onPrefs({ scuOverrides: rest })
  }
  const setScu = (text: string) => {
    setScuText(text)
    if (!ship) return
    // campo vazio = usar o SCU do UEX
    if (text.trim() === '') return resetScu()
    const n = parseAmount(text)
    if (!Number.isFinite(n) || n < 0) return
    onPrefs({ scuOverrides: { ...prefs.scuOverrides, [ship.id]: Math.floor(n) } })
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
          {mine.length > 0 ? (
            <>
              <optgroup label={t('fleet.mine')}>{mine.map(shipOption)}</optgroup>
              <optgroup label={t('fleet.allShips')}>{others.map(shipOption)}</optgroup>
            </>
          ) : (
            others.map(shipOption)
          )}
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
          {...scuBind}
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
          {...budgetBind}
          placeholder="0"
          onChange={(e) => {
            setBudgetText(e.target.value)
            const n = parseAmount(e.target.value)
            onPrefs({ budget: Number.isFinite(n) ? n : 0 })
          }}
        />
      </label>
      {balance !== null && (
        <Tooltip content={balance <= 0 ? t('routes.balanceEmpty') : null}>
          <button className="btn" disabled={balance <= 0} onClick={() => onPrefs({ budget: balance })}>
            {t('routes.useBalance')}
          </button>
        </Tooltip>
      )}
      <AvoidPicker terminals={terminals} value={prefs.avoid} onChange={(avoid) => onPrefs({ avoid })} />
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
          <label className="field">
            {t('routes.maxRisk')}
            <select className="select" value={prefs.maxRisk} onChange={(e) => onPrefs({ maxRisk: e.target.value as MaxRisk })}>
              <option value="any">{t('routes.riskAny')}</option>
              <option value="risky">{t('routes.riskUpTo', { level: t('risk.risky') })}</option>
              <option value="medium">{t('routes.riskUpTo', { level: t('risk.medium') })}</option>
              <option value="safe">{t('routes.riskOnly', { level: t('risk.safe') })}</option>
            </select>
          </label>
          <label className="check">
            <input type="checkbox" checked={prefs.excludeIllegal} onChange={(e) => onPrefs({ excludeIllegal: e.target.checked })} />
            {t('routes.excludeIllegal')}
          </label>
      </>
      <p className="muted risk-note">{t('routes.riskNote')}</p>
    </div>
  )
}

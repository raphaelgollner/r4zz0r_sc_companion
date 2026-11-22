import { useEffect, useState, type MouseEvent } from 'react'
import { useTerminal } from '../data/terminals'
import { locationPath, placeName } from '../domain/location'
import { riskOf } from '../domain/risk'
import type { Terminal } from '../data/types'
import { useI18n } from '../i18n/i18n'
import { Tooltip } from './Tooltip'

function CopyDestination({ name }: { name: string }) {
  const { t } = useI18n()
  const [status, setStatus] = useState<'idle' | 'ok' | 'fail'>('idle')
  useEffect(() => {
    if (status === 'idle') return
    const id = setTimeout(() => setStatus('idle'), 1500)
    return () => clearTimeout(id)
  }, [status])
  const copy = async (e: MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(name)
      setStatus('ok')
    } catch {
      setStatus('fail')
    }
  }
  const label = t('copy.dest', { name })
  return (
    <>
      <button type="button" className="copy-btn" aria-label={label} title={label} onClick={copy} />
      {status !== 'idle' && (
        <span className={status === 'ok' ? 'copy-status profit' : 'copy-status loss'} role="status">
          {t(status === 'ok' ? 'copy.ok' : 'copy.fail')}
        </span>
      )}
    </>
  )
}

export function RiskBadge({ terminal }: { terminal: Terminal | undefined }) {
  const { t } = useI18n()
  const risk = riskOf(terminal)
  if (!risk) return null
  const title = t('risk.title', { faction: terminal?.faction_name || t('risk.noFaction') })
  return (
    <span className={`risk risk-${risk}`} title={title}>
      {t(`risk.${risk}`)}
    </span>
  )
}

export function TerminalCopy({ id, fallback }: { id: number; fallback: string }) {
  const t = useTerminal(id)
  return <CopyDestination name={(t && placeName(t)) || fallback} />
}

export function TerminalName({ id, fallback, copy = true }: { id: number; fallback: string; copy?: boolean }) {
  const t = useTerminal(id)
  if (!t)
    return (
      <span className="terminal-name">
        <span>{fallback}</span>
        {copy && <CopyDestination name={fallback} />}
      </span>
    )
  const place = placeName(t)
  const f = fallback.toLowerCase()
  const p = place?.toLowerCase() ?? ''

  const placeExtendsName = !!place && p.startsWith(f)
  const showPlace = !!place && !placeExtendsName && !f.includes(p)
  return (
    <span className="terminal-name">
      <Tooltip content={locationPath(t).join(' › ')}>
        <span className="terminal-name">
          <span>{placeExtendsName ? place : fallback}</span>
          {showPlace && <span className="muted place">{place}</span>}
        </span>
      </Tooltip>
      <RiskBadge terminal={t} />
      {copy && <CopyDestination name={place ?? fallback} />}
    </span>
  )
}

import { useEffect, useState, type MouseEvent } from 'react'
import { useTerminal } from '../data/terminals'
import { locationPath, placeName } from '../domain/location'
import { useI18n } from '../i18n/i18n'
import { Tooltip } from './Tooltip'

/** Copia o destino para colar na busca do mapa do jogo. */
function CopyDestination({ name }: { name: string }) {
  const { t } = useI18n()
  const [status, setStatus] = useState<'idle' | 'ok' | 'fail'>('idle')
  useEffect(() => {
    if (status === 'idle') return
    const id = setTimeout(() => setStatus('idle'), 1500)
    return () => clearTimeout(id)
  }, [status])
  const copy = async (e: MouseEvent) => {
    // As linhas das tabelas são clicáveis: copiar não deve abrir nada.
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

/** Nome do terminal + nome do lugar (em cinza) + tooltip com a localização completa + copiar destino. */
export function TerminalName({ id, fallback }: { id: number; fallback: string }) {
  const t = useTerminal(id)
  if (!t)
    return (
      <span className="terminal-name">
        <span>{fallback}</span>
        <CopyDestination name={fallback} />
      </span>
    )
  const place = placeName(t)
  const f = fallback.toLowerCase()
  const p = place?.toLowerCase() ?? ''
  // "ARC-L3" + "ARC-L3 Modern Express Station" → mostra só o nome completo do lugar.
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
      <CopyDestination name={place ?? fallback} />
    </span>
  )
}

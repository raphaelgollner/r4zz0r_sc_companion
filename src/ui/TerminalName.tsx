import { useTerminal } from '../data/terminals'
import { locationPath, placeName } from '../domain/location'
import { Tooltip } from './Tooltip'

/** Nome do terminal + nome do lugar (em cinza) + tooltip com a localização completa. */
export function TerminalName({ id, fallback }: { id: number; fallback: string }) {
  const t = useTerminal(id)
  if (!t) return <span>{fallback}</span>
  const place = placeName(t)
  const f = fallback.toLowerCase()
  const p = place?.toLowerCase() ?? ''
  // "ARC-L3" + "ARC-L3 Modern Express Station" → mostra só o nome completo do lugar.
  const placeExtendsName = !!place && p.startsWith(f)
  const showPlace = !!place && !placeExtendsName && !f.includes(p)
  return (
    <Tooltip content={locationPath(t).join(' › ')}>
      <span className="terminal-name">
        <span>{placeExtendsName ? place : fallback}</span>
        {showPlace && <span className="muted place">{place}</span>}
      </span>
    </Tooltip>
  )
}

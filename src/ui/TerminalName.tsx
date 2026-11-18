import { useTerminal } from '../data/terminals'
import { locationPath, placeName } from '../domain/location'
import { Tooltip } from './Tooltip'

/** Nome do terminal + nome do lugar (em cinza) + tooltip com a localização completa. */
export function TerminalName({ id, fallback }: { id: number; fallback: string }) {
  const t = useTerminal(id)
  if (!t) return <span>{fallback}</span>
  const place = placeName(t)
  const showPlace = place && !fallback.toLowerCase().includes(place.toLowerCase())
  return (
    <Tooltip content={locationPath(t).join(' › ')}>
      <span className="terminal-name">
        <span>{fallback}</span>
        {showPlace && <span className="muted place">{place}</span>}
      </span>
    </Tooltip>
  )
}

import { useEffect } from 'react'
import { QUERY_TTL } from '../../data/ttl'
import type { TerminalDistance } from '../../data/types'
import { useUexQuery } from '../../data/useUex'

/**
 * Busca a distância (Gm) entre dois terminais e avisa o pai. Não desenha nada.
 * Cada par fica no cache por 7 dias; mudar a carga não refaz a consulta.
 */
export function DistanceFetcher({
  origin,
  destination,
  onDistance,
}: {
  origin: number
  destination: number
  onDistance: (destination: number, distance: number | null) => void
}) {
  const q = useUexQuery<TerminalDistance>(
    'terminals_distances',
    { id_terminal_origin: origin, id_terminal_destination: destination },
    QUERY_TTL.terminals_distances,
  )
  const value = q.data ? Number(q.data.distance) : null
  const distance = value !== null && Number.isFinite(value) ? value : null
  const done = !q.loading
  useEffect(() => {
    if (done || q.data) onDistance(destination, distance)
  }, [destination, distance, done, q.data, onDistance])
  return null
}

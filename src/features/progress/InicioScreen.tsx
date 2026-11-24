import type { Commodity, Terminal } from '../../data/types'
import { useUex } from '../../data/useUex'
import { ProgressView } from './ProgressView'

export function InicioScreen() {
  const commodities = useUex<Commodity[]>('commodities')
  const terminals = useUex<Terminal[]>('terminals')
  return <ProgressView commodities={commodities.data ?? undefined} terminals={terminals.data ?? undefined} />
}

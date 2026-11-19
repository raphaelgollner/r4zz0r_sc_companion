import type { Commodity, Terminal } from '../../data/types'
import { useUex } from '../../data/useUex'
import { ProgressView } from './ProgressView'

/** INÍCIO: o progresso funciona mesmo sem UEX; commodities e terminais só alimentam os campos de busca. */
export function InicioScreen() {
  const commodities = useUex<Commodity[]>('commodities')
  const terminals = useUex<Terminal[]>('terminals')
  return <ProgressView commodities={commodities.data ?? undefined} terminals={terminals.data ?? undefined} />
}

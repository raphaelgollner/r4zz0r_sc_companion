import type { Commodity, PriceRow, Terminal, Vehicle } from '../../data/types'
import { useUex } from '../../data/useUex'
import { ImportView } from '../progress/ImportView'
import { OverlayRecordView } from './OverlayRecordView'

export function OverlayRecordScreen() {
  const commodities = useUex<Commodity[]>('commodities')
  const terminals = useUex<Terminal[]>('terminals')
  const prices = useUex<PriceRow[]>('commodities_prices_all')
  const vehicles = useUex<Vehicle[]>('vehicles')
  return (
    <OverlayRecordView
      commodities={commodities.data ?? undefined}
      terminals={terminals.data ?? undefined}
      prices={prices.data ?? undefined}
      vehicles={vehicles.data ?? undefined}
    />
  )
}

export function OverlaySettingsScreen() {
  const commodities = useUex<Commodity[]>('commodities')
  const terminals = useUex<Terminal[]>('terminals')
  const prices = useUex<PriceRow[]>('commodities_prices_all')
  return <ImportView commodities={commodities.data ?? undefined} terminals={terminals.data ?? undefined} prices={prices.data ?? undefined} />
}

import type { Commodity, PriceRow, Terminal, Vehicle } from '../../data/types'
import { refreshAll, useUex, type UexState } from '../../data/useUex'
import { usePrefs } from '../../store/prefs'
import { useOptionalBalance } from '../../store/progress'
import { Loaded } from '../trade/screens'
import { HomeView } from './HomeView'

export function HomeScreen({ onSetup }: { onSetup: () => void }) {
  const commodities = useUex<Commodity[]>('commodities')
  const prices = useUex<PriceRow[]>('commodities_prices_all')
  const vehicles = useUex<Vehicle[]>('vehicles')
  const terminals = useUex<Terminal[]>('terminals')
  // Os demais recursos também são carregados aqui para deixar o cache pronto.
  const status = useUex('commodities_status')
  const planets = useUex('planets')
  const moons = useUex('moons')
  const index = useUex('currencies_index')
  const history = useUex('currencies_index_history')
  const [prefs, setPrefs] = usePrefs()
  const balance = useOptionalBalance()

  const all: [string, UexState<unknown>][] = [
    ['commodities', commodities],
    ['commodities_prices_all', prices],
    ['commodities_status', status],
    ['vehicles', vehicles],
    ['terminals', terminals],
    ['planets', planets],
    ['moons', moons],
    ['currencies_index', index],
    ['currencies_index_history', history],
  ]

  return (
    <Loaded states={[commodities, prices, vehicles, terminals] as UexState<unknown>[]}>
      {() => (
        <HomeView
          vehicles={vehicles.data!}
          commodities={commodities.data!}
          prices={prices.data!}
          terminals={terminals.data!}
          now={Date.now()}
          prefs={prefs}
          onPrefs={setPrefs}
          balance={balance}
          cache={all.map(([resource, s]) => ({ resource, fetchedAt: s.fetchedAt }))}
          refreshing={all.some(([, s]) => s.loading)}
          onSetup={onSetup}
          onRefreshAll={() => refreshAll(true)}
        />
      )}
    </Loaded>
  )
}

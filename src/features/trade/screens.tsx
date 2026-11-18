import { useMemo, type ReactNode } from 'react'
import type { Commodity, CommodityStatus, CurrencyIndex, CurrencyIndexPoint, Moon, Planet, PriceRow, Terminal, Vehicle } from '../../data/types'
import { usePrefs } from '../../store/prefs'
import { useOptionalBalance } from '../../store/progress'
import { RoutesView } from './RoutesView'
import { useUex, type UexState } from '../../data/useUex'
import { useI18n } from '../../i18n/i18n'
import { LoadState } from '../../ui/components'
import { CommoditiesView } from './CommoditiesView'
import { HistoryPanel } from './HistoryPanel'
import { CurrenciesView } from './CurrenciesView'
import { HarvestablesView } from './HarvestablesView'
import { LocationsView } from './LocationsView'
import { PriceFinderView } from './PriceFinderView'

/** Junta vários recursos num só estado de carregamento. */
export function useMany(states: UexState<unknown>[]) {
  return {
    loading: states.some((s) => s.loading),
    error: states.find((s) => s.error)?.error ?? null,
    hasData: states.every((s) => s.data !== null),
    retry: () => states.forEach((s) => s.data === null && s.refresh()),
  }
}

export function Loaded({ states, children }: { states: UexState<unknown>[]; children: () => ReactNode }) {
  const { t } = useI18n()
  const m = useMany(states)
  return (
    <div className="loaded">
      <div className="loaded-bar">
        <button className="btn" disabled={m.loading} onClick={() => states.forEach((s) => s.refresh())}>
          {t('common.refresh')}
        </button>
      </div>
      <LoadState loading={m.loading} error={m.error} hasData={m.hasData} onRetry={m.retry}>
        {m.hasData && children()}
      </LoadState>
    </div>
  )
}

export function useTradeBase() {
  const commodities = useUex<Commodity[]>('commodities')
  const prices = useUex<PriceRow[]>('commodities_prices_all')
  const status = useUex<CommodityStatus>('commodities_status')
  return { commodities, prices, status }
}


export function CommoditiesScreen() {
  const { commodities, prices, status } = useTradeBase()
  return (
    <Loaded states={[commodities, prices, status] as UexState<unknown>[]}>
      {() => <CommoditiesView
          commodities={commodities.data!}
          prices={prices.data!}
          status={status.data!}
          now={Date.now()}
          renderHistory={(cid, row) => (
            <HistoryPanel key={row.id} commodityId={cid} terminalId={row.id_terminal} terminalName={row.terminal_name} />
          )}
        />}
    </Loaded>
  )
}

export function PriceFinderScreen() {
  const { commodities, prices } = useTradeBase()
  return (
    <Loaded states={[commodities, prices] as UexState<unknown>[]}>
      {() => <PriceFinderView commodities={commodities.data!} prices={prices.data!} now={Date.now()} />}
    </Loaded>
  )
}

export function LocationsScreen() {
  const terminals = useUex<Terminal[]>('terminals')
  const prices = useUex<PriceRow[]>('commodities_prices_all')
  return (
    <Loaded states={[terminals, prices] as UexState<unknown>[]}>
      {() => <LocationsView terminals={terminals.data!} prices={prices.data!} now={Date.now()} />}
    </Loaded>
  )
}

const toMap = <T extends { id: number }>(list: T[] | null) => new Map((list ?? []).map((x) => [x.id, x]))

export function HarvestablesScreen() {
  const { commodities, prices } = useTradeBase()
  const planets = useUex<Planet[]>('planets')
  const moons = useUex<Moon[]>('moons')
  const planetMap = useMemo(() => toMap(planets.data), [planets.data])
  const moonMap = useMemo(() => toMap(moons.data), [moons.data])
  return (
    <Loaded states={[commodities, prices, planets, moons] as UexState<unknown>[]}>
      {() => <HarvestablesView commodities={commodities.data!} prices={prices.data!} planets={planetMap} moons={moonMap} now={Date.now()} />}
    </Loaded>
  )
}

export function CurrenciesScreen() {
  const index = useUex<CurrencyIndex[]>('currencies_index')
  const history = useUex<CurrencyIndexPoint[]>('currencies_index_history')
  return (
    <Loaded states={[index, history] as UexState<unknown>[]}>
      {() => <CurrenciesView index={index.data!} history={history.data!} now={Date.now()} />}
    </Loaded>
  )
}

export function RoutesScreen() {
  const { commodities, prices } = useTradeBase()
  const vehicles = useUex<Vehicle[]>('vehicles')
  const terminals = useUex<Terminal[]>('terminals')
  const [prefs, setPrefs] = usePrefs()
  const balance = useOptionalBalance()
  return (
    <Loaded states={[commodities, prices, vehicles, terminals] as UexState<unknown>[]}>
      {() => (
        <RoutesView
          vehicles={vehicles.data!}
          commodities={commodities.data!}
          prices={prices.data!}
          terminals={terminals.data!}
          now={Date.now()}
          prefs={prefs}
          onPrefs={setPrefs}
          balance={balance}
        />
      )}
    </Loaded>
  )
}

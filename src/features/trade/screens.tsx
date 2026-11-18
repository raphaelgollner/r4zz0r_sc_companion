import type { ReactNode } from 'react'
import type { Commodity, CommodityStatus, PriceRow } from '../../data/types'
import { useUex, type UexState } from '../../data/useUex'
import { LoadState } from '../../ui/components'
import { CommoditiesView } from './CommoditiesView'
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
  const m = useMany(states)
  return (
    <LoadState loading={m.loading} error={m.error} hasData={m.hasData} onRetry={m.retry}>
      {m.hasData && children()}
    </LoadState>
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
      {() => <CommoditiesView commodities={commodities.data!} prices={prices.data!} status={status.data!} now={Date.now()} />}
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

import { clearCache, refreshAll, useUex, type UexState } from '../../data/useUex'
import { SettingsView } from './SettingsView'

export function SettingsScreen({ version }: { version: string }) {
  const all: [string, UexState<unknown>][] = [
    ['commodities', useUex('commodities')],
    ['commodities_prices_all', useUex('commodities_prices_all')],
    ['commodities_status', useUex('commodities_status')],
    ['vehicles', useUex('vehicles')],
    ['terminals', useUex('terminals')],
    ['planets', useUex('planets')],
    ['moons', useUex('moons')],
    ['currencies_index', useUex('currencies_index')],
    ['currencies_index_history', useUex('currencies_index_history')],
    ['vehicles_purchases_prices_all', useUex('vehicles_purchases_prices_all')],
    ['vehicles_rentals_prices_all', useUex('vehicles_rentals_prices_all')],
  ]
  return (
    <SettingsView
      version={version}
      onClearCache={() => clearCache()}
      cache={all.map(([resource, s]) => ({ resource, fetchedAt: s.fetchedAt }))}
      refreshing={all.some(([, s]) => s.loading)}
      onRefreshAll={() => refreshAll(true)}
    />
  )
}

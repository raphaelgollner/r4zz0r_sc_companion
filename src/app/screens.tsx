import { HomeScreen } from '../features/home/HomeScreen'
import { SettingsView } from '../features/settings/SettingsView'
import { ShipsScreen } from '../features/ships/ShipsScreen'
import { clearCache } from '../data/useUex'
import {
  CommoditiesScreen,
  CurrenciesScreen,
  HarvestablesScreen,
  LocationsScreen,
  PriceFinderScreen,
  RoutesScreen,
} from '../features/trade/screens'
import type { Screens } from './App'

/** Telas do app. Cada tarefa registra a sua aqui. */
export const screens: Screens = {
  home: (go) => <HomeScreen onSetup={() => go({ main: 'trade', trade: 'routes' })} />,
  ships: () => <ShipsScreen />,
  settings: () => <SettingsView version={__APP_VERSION__} onClearCache={() => clearCache()} />,
  trade: {
    commodities: () => <CommoditiesScreen />,
    locations: () => <LocationsScreen />,
    harvestables: () => <HarvestablesScreen />,
    finder: () => <PriceFinderScreen />,
    routes: () => <RoutesScreen />,
    currencies: () => <CurrenciesScreen />,
  },
}

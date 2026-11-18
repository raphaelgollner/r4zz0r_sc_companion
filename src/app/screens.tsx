import { HomeScreen } from '../features/home/HomeScreen'
import { ShipsScreen } from '../features/ships/ShipsScreen'
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
  trade: {
    commodities: () => <CommoditiesScreen />,
    locations: () => <LocationsScreen />,
    harvestables: () => <HarvestablesScreen />,
    finder: () => <PriceFinderScreen />,
    routes: () => <RoutesScreen />,
    currencies: () => <CurrenciesScreen />,
  },
}

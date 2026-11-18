import {
  CommoditiesScreen,
  CurrenciesScreen,
  HarvestablesScreen,
  LocationsScreen,
  PriceFinderScreen,
} from '../features/trade/screens'
import type { Screens } from './App'

/** Telas do app. Cada tarefa registra a sua aqui. */
export const screens: Screens = {
  trade: {
    commodities: () => <CommoditiesScreen />,
    locations: () => <LocationsScreen />,
    harvestables: () => <HarvestablesScreen />,
    finder: () => <PriceFinderScreen />,
    currencies: () => <CurrenciesScreen />,
  },
}

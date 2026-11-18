import { HomeScreen } from '../features/home/HomeScreen'
import { EquipmentScreen, GroundScreen, OresScreen, PlannerScreen, RefineriesScreen } from '../features/mining/screens'
import { ProgressView } from '../features/progress/ProgressView'
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
  progress: () => <ProgressView />,
  settings: () => <SettingsView version={__APP_VERSION__} onClearCache={() => clearCache()} />,
  mining: {
    ores: () => <OresScreen />,
    refineries: () => <RefineriesScreen />,
    planner: () => <PlannerScreen />,
    equipment: () => <EquipmentScreen />,
    ground: () => <GroundScreen />,
  },
  trade: {
    commodities: () => <CommoditiesScreen />,
    locations: () => <LocationsScreen />,
    harvestables: () => <HarvestablesScreen />,
    finder: () => <PriceFinderScreen />,
    routes: () => <RoutesScreen />,
    currencies: () => <CurrenciesScreen />,
  },
}

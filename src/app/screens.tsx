import { FleetScreen } from '../features/fleet/screens'
import { HomeScreen } from '../features/home/HomeScreen'
import { EquipmentScreen, GroundScreen, OresScreen, PlannerScreen, RefineriesScreen } from '../features/mining/screens'
import { MaterialsScreen, SalvageEquipmentScreen, SalvagePlannerScreen, SalvageShipsScreen } from '../features/salvage/screens'
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
  fleet: () => <FleetScreen />,
  settings: () => <SettingsView version={__APP_VERSION__} onClearCache={() => clearCache()} />,
  salvage: {
    materials: () => <MaterialsScreen />,
    planner: () => <SalvagePlannerScreen />,
    equipment: () => <SalvageEquipmentScreen />,
    ships: () => <SalvageShipsScreen />,
  },
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

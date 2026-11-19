import { FleetScreen } from '../features/fleet/screens'
import { EquipmentScreen, GroundScreen, OresScreen, PlannerScreen, RefineriesScreen } from '../features/mining/screens'
import { MaterialsScreen, SalvageEquipmentScreen, SalvagePlannerScreen, SalvageShipsScreen } from '../features/salvage/screens'
import { ProgressView } from '../features/progress/ProgressView'
import { SettingsScreen } from '../features/settings/SettingsScreen'
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
  home: () => <ProgressView />,
  ships: () => <ShipsScreen />,
  fleet: () => <FleetScreen />,
  settings: () => <SettingsScreen version={__APP_VERSION__} />,
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

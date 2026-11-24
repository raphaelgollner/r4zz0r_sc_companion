import { FleetScreen } from '../features/fleet/screens'
import { OverlayRecordScreen, OverlaySettingsScreen } from '../features/overlay/screens'
import { EquipmentScreen, GroundScreen, OresScreen, PlannerScreen, RefineriesScreen } from '../features/mining/screens'
import { MaterialsScreen, SalvageEquipmentScreen, SalvagePlannerScreen, SalvageShipsScreen } from '../features/salvage/screens'
import { InicioScreen } from '../features/progress/InicioScreen'
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

export const screens: Screens = {
  overlay: { record: () => <OverlayRecordScreen />, settings: () => <OverlaySettingsScreen /> },
  home: () => <InicioScreen />,
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

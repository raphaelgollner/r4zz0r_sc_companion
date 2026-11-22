import { usePrefs } from '../../store/prefs'

export function usePrefsFreshness(): { warnHours: number; staleDays: number } {
  const [prefs] = usePrefs()
  return { warnHours: prefs.warnHours, staleDays: prefs.staleDays }
}

import { usePrefs } from '../../store/prefs'

/** Limites de "dado envelhecendo/velho" escolhidos pelo usuário em AJUSTES. */
export function usePrefsFreshness(): { warnHours: number; staleDays: number } {
  const [prefs] = usePrefs()
  return { warnHours: prefs.warnHours, staleDays: prefs.staleDays }
}

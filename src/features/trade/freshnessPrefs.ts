/**
 * Limites de "dado envelhecendo/velho" escolhidos pelo usuário.
 * Até a Task 12 (SETTINGS) usa os padrões; depois lê das preferências.
 */
export function usePrefsFreshness(): { warnHours: number; staleDays: number } {
  return { warnHours: 24, staleDays: 7 }
}

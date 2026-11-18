export type AgeLevel = 'fresh' | 'aging' | 'stale' | 'unknown'

/** Classifica a idade de um dado do UEX (`date_modified` em segundos Unix). */
export function ageLevel(
  dateModifiedSec: number | null | undefined,
  nowMs: number,
  warnHours = 24,
  staleDays = 7,
): AgeLevel {
  if (!dateModifiedSec || dateModifiedSec <= 0) return 'unknown'
  const ageMs = nowMs - dateModifiedSec * 1000
  if (ageMs >= staleDays * 86_400_000) return 'stale'
  if (ageMs >= warnHours * 3_600_000) return 'aging'
  return 'fresh'
}

export function formatAge(dateModifiedSec: number | null | undefined, nowMs: number): string {
  if (!dateModifiedSec || dateModifiedSec <= 0) return 'data desconhecida'
  const ageSec = Math.max(0, nowMs / 1000 - dateModifiedSec)
  if (ageSec < 60) return 'agora'
  const min = Math.floor(ageSec / 60)
  if (min < 60) return `há ${min} min`
  const hours = Math.floor(min / 60)
  if (hours < 48) return `há ${hours} h`
  return `há ${Math.floor(hours / 24)} dias`
}

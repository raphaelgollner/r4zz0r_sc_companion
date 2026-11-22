export type AgeLevel = 'fresh' | 'aging' | 'stale' | 'unknown'

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

export function formatAge(dateModifiedSec: number | null | undefined, nowMs: number, lang: 'pt' | 'en' = 'pt'): string {
  const en = lang === 'en'
  if (!dateModifiedSec || dateModifiedSec <= 0) return en ? 'unknown date' : 'data desconhecida'
  const ageSec = Math.max(0, nowMs / 1000 - dateModifiedSec)
  if (ageSec < 60) return en ? 'now' : 'agora'
  const min = Math.floor(ageSec / 60)
  if (min < 60) return en ? `${min} min ago` : `há ${min} min`
  const hours = Math.floor(min / 60)
  if (hours < 48) return en ? `${hours} h ago` : `há ${hours} h`
  const days = Math.floor(hours / 24)
  return en ? `${days} days ago` : `há ${days} dias`
}

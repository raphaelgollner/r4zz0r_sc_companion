import { useEffect, useState } from 'react'
import { formatAuec } from '../../domain/format'
import { useI18n } from '../../i18n/i18n'

export function formatDuration(ms: number): string {
  const min = Math.max(0, Math.floor(ms / 60_000))
  return `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`
}

export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

export const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${formatAuec(Math.abs(n))}`

export function useDateFmt() {
  const { lang } = useI18n()
  return (ms: number) => new Date(ms).toLocaleString(lang === 'en' ? 'en-US' : 'pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

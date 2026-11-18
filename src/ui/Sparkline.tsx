export interface SparkSeries {
  values: number[]
  color: string
  label: string
}

/** Linhas simples em SVG; valores maiores ficam mais acima. Várias séries dividem a mesma escala. */
export function Sparkline({
  points,
  series,
  width = 480,
  height = 90,
}: {
  points?: number[]
  series?: SparkSeries[]
  width?: number
  height?: number
}) {
  const all: SparkSeries[] = series ?? (points ? [{ values: points, color: 'var(--gold)', label: '' }] : [])
  const drawable = all.filter((s) => s.values.length >= 2)
  if (drawable.length === 0) return null
  const flat = drawable.flatMap((s) => s.values)
  const min = Math.min(...flat)
  const max = Math.max(...flat)
  const span = max - min || 1
  const pad = 4
  const line = (vals: number[]) =>
    vals
      .map((v, i) => {
        const x = pad + (i / (vals.length - 1)) * (width - pad * 2)
        const y = pad + (1 - (v - min) / span) * (height - pad * 2)
        return `${x.toFixed(1)},${y.toFixed(1)}`
      })
      .join(' ')
  return (
    <svg data-testid="sparkline" viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none" role="img">
      {drawable.map((s) => (
        <polyline
          key={s.label || s.color}
          points={line(s.values)}
          fill="none"
          stroke={s.color}
          strokeWidth="2"
          style={{ filter: `drop-shadow(0 0 4px ${s.color})` }}
        />
      ))}
    </svg>
  )
}

/** Linha simples em SVG; valores maiores ficam mais acima. */
export function Sparkline({ points, width = 480, height = 90 }: { points: number[]; width?: number; height?: number }) {
  if (points.length < 2) return null
  const min = Math.min(...points)
  const max = Math.max(...points)
  const span = max - min || 1
  const pad = 4
  const coords = points.map((v, i) => {
    const x = pad + (i / (points.length - 1)) * (width - pad * 2)
    const y = pad + (1 - (v - min) / span) * (height - pad * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  return (
    <svg data-testid="sparkline" viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none" role="img">
      <polyline points={coords.join(' ')} fill="none" stroke="var(--gold)" strokeWidth="2" style={{ filter: 'drop-shadow(0 0 4px var(--glow-gold))' }} />
    </svg>
  )
}

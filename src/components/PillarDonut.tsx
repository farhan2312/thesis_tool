export interface DonutSegment {
  name: string
  value: number
  color: string
}

interface Props {
  data: DonutSegment[]
  centerValue: string
  centerLabel: string
  size?: number
}

/**
 * Lightweight static SVG donut (no charting library / ResponsiveContainer). Keeps the
 * analytics page fast and free of continuous re-measurement.
 */
export default function PillarDonut({ data, centerValue, centerLabel, size = 190 }: Props) {
  const total = data.reduce((a, d) => a + d.value, 0) || 1
  const cx = size / 2
  const cy = size / 2
  const sw = size * 0.15
  const r = (size - sw) / 2 - 2
  const C = 2 * Math.PI * r

  let acc = 0
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--line)" strokeWidth={sw} />
      {data.map((d) => {
        const segLen = (d.value / total) * C
        const el = (
          <circle
            key={d.name}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={d.color}
            strokeWidth={sw}
            strokeDasharray={`${Math.max(segLen - 2, 0)} ${C - Math.max(segLen - 2, 0)}`}
            strokeDashoffset={-acc}
            transform={`rotate(-90 ${cx} ${cy})`}
          >
            <title>{`${d.name}: ${d.value}`}</title>
          </circle>
        )
        acc += segLen
        return el
      })}
      <text x={cx} y={cy - 4} textAnchor="middle" className="donut-center-value">
        {centerValue}
      </text>
      <text x={cx} y={cy + 15} textAnchor="middle" className="donut-center-label">
        {centerLabel}
      </text>
    </svg>
  )
}

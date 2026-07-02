import type { CSSProperties } from 'react'

export interface HBarDatum {
  key: string
  label: string
  value: number
  color: string
}

interface Props {
  data: HBarDatum[]
  /** width reserved for labels so long names never wrap or truncate */
  labelWidth?: number
  valueFormat?: (n: number) => string
  emptyText?: string
}

/**
 * Custom horizontal bar list. Unlike a charting library's category axis, the label
 * column has a fixed generous width and never wraps text, which keeps long ESG topic
 * and metric-family names readable with plenty of spacing.
 */
export default function HBars({ data, labelWidth = 220, valueFormat, emptyText }: Props) {
  if (!data.length) return <p className="empty">{emptyText ?? 'No data.'}</p>
  const max = Math.max(...data.map((d) => d.value), 1)
  const style = { '--label-w': `${labelWidth}px` } as CSSProperties
  return (
    <div className="hbars" style={style}>
      {data.map((d) => (
        <div className="hbar" key={d.key}>
          <div className="hbar-label" title={d.label}>
            {d.label}
          </div>
          <div className="hbar-track">
            <div
              className="hbar-fill"
              style={{ width: `${(d.value / max) * 100}%`, background: d.color }}
            />
          </div>
          <div className="hbar-val">{valueFormat ? valueFormat(d.value) : d.value}</div>
        </div>
      ))}
    </div>
  )
}

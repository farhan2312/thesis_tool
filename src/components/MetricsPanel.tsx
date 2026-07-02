import { useMemo, useState } from 'react'
import { familyColor } from '../lib/palette'
import type { Metric } from '../lib/types'
import CardHead from './CardHead'
import FilterChips, { type ChipOption } from './FilterChips'
import HBars, { type HBarDatum } from './HBars'

function fmt(v: number | null): string {
  if (v == null) return '-'
  if (Math.abs(v) >= 1e6) return v.toLocaleString(undefined, { maximumFractionDigits: 0 })
  return v.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

export default function MetricsPanel({ metrics }: { metrics: Metric[] }) {
  const [family, setFamily] = useState('all')
  const [q, setQ] = useState('')

  const familyCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const m of metrics) counts[m.metric_family] = (counts[m.metric_family] ?? 0) + 1
    return counts
  }, [metrics])

  const familyBars: HBarDatum[] = useMemo(
    () =>
      Object.entries(familyCounts)
        .map(([name, count]) => ({ key: name, label: name, value: count, color: familyColor(name) }))
        .sort((a, b) => b.value - a.value),
    [familyCounts],
  )

  const familyOptions: ChipOption[] = [
    { key: 'all', label: 'All families', count: metrics.length },
    ...familyBars.map((f) => ({ key: f.key, label: f.label, color: f.color, count: f.value })),
  ]

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return metrics.filter(
      (m) =>
        (family === 'all' || m.metric_family === family) &&
        (!s ||
          [m.metric_family, m.topic, m.unit, m.match_text, m.snippet, String(m.value_num)]
            .join(' ')
            .toLowerCase()
            .includes(s)),
    )
  }, [metrics, family, q])

  return (
    <div className="card">
      <CardHead
        step="B"
        title="Extracted figures"
        tag="Component B"
        desc="Rule-based extraction of the reported numbers; every figure traces back to its source paragraph."
      />

      {metrics.length === 0 ? (
        <p className="empty">No quantitative figures matched the extraction patterns in this report.</p>
      ) : (
        <>
          <h4 className="subhead">Quantitative figures by metric family</h4>
          <HBars data={familyBars} labelWidth={210} />

          <div className="table-tools" style={{ marginTop: 20 }}>
            <input
              className="search"
              placeholder="Search figures — topic, unit, value, snippet…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <span className="rowcount">{filtered.length} rows</span>
          </div>
          <FilterChips options={familyOptions} value={family} onChange={setFamily} />

          <div className="tbl-scroll" style={{ marginTop: 12 }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: 168 }}>Family</th>
                  <th style={{ width: 168 }}>Topic</th>
                  <th style={{ width: 96 }}>Value</th>
                  <th style={{ width: 96 }}>Unit</th>
                  <th style={{ width: 48 }}>Pg</th>
                  <th>Snippet</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m, i) => (
                  <tr key={i}>
                    <td>
                      <span
                        className="topic-tag"
                        style={{
                          backgroundColor: `${familyColor(m.metric_family)}1f`,
                          color: familyColor(m.metric_family),
                        }}
                      >
                        {m.metric_family}
                      </span>
                    </td>
                    <td>{m.topic}</td>
                    <td className="mono">{fmt(m.value_num)}</td>
                    <td>{m.unit}</td>
                    <td className="mono">{m.page}</td>
                    <td className="snippet">{m.snippet}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

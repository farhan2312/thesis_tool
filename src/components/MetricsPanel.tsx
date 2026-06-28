import { useMemo, useState } from 'react'
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { familyColor } from '../lib/palette'
import type { Metric } from '../lib/types'

function fmt(v: number | null): string {
  if (v == null) return '—'
  if (Math.abs(v) >= 1e6) return v.toLocaleString(undefined, { maximumFractionDigits: 0 })
  return v.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

export default function MetricsPanel({ metrics }: { metrics: Metric[] }) {
  const [q, setQ] = useState('')

  const familyData = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const m of metrics) counts[m.metric_family] = (counts[m.metric_family] ?? 0) + 1
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count, color: familyColor(name) }))
      .sort((a, b) => b.count - a.count)
  }, [metrics])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return metrics
    return metrics.filter((m) =>
      [m.metric_family, m.topic, m.unit, m.match_text, m.snippet, String(m.value_num)]
        .join(' ')
        .toLowerCase()
        .includes(s),
    )
  }, [metrics, q])

  if (metrics.length === 0) {
    return (
      <div className="card">
        <h3 className="card-title">Extracted figures</h3>
        <p className="empty">No quantitative figures matched the extraction patterns in this report.</p>
      </div>
    )
  }

  const barHeight = Math.max(120, familyData.length * 38 + 16)

  return (
    <div className="card">
      <h3 className="card-title">Extracted figures</h3>
      <p className="card-sub">
        {metrics.length} quantitative data points found by the regex families and attributed to the
        classifier&rsquo;s topic for each paragraph.
      </p>

      <ResponsiveContainer width="100%" height={barHeight}>
        <BarChart data={familyData} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 8 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            width={170}
            tick={{ fontSize: 11, fill: '#5a6776' }}
            interval={0}
          />
          <Tooltip cursor={{ fill: 'rgba(0,0,0,0.03)' }} formatter={(v: number) => [`${v} figures`, 'Count']} />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={18} isAnimationActive={false}>
            {familyData.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="table-tools" style={{ marginTop: 14 }}>
        <input
          className="search"
          placeholder="Search figures — topic, unit, value, snippet…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <span style={{ color: 'var(--ink-faint)', fontSize: 12.5 }}>{filtered.length} rows</span>
      </div>

      <div className="tbl-scroll">
        <table>
          <thead>
            <tr>
              <th style={{ width: 150 }}>Family</th>
              <th style={{ width: 150 }}>Topic</th>
              <th style={{ width: 90 }}>Value</th>
              <th style={{ width: 90 }}>Unit</th>
              <th style={{ width: 44 }}>Pg</th>
              <th>Snippet</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m, i) => (
              <tr key={i}>
                <td>
                  <span
                    className="topic-tag"
                    style={{ backgroundColor: `${familyColor(m.metric_family)}1f`, color: familyColor(m.metric_family) }}
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
    </div>
  )
}

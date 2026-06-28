import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PILLAR_COLOR, PILLAR_LABEL } from '../lib/palette'
import type { ClassifiedParagraph, PillarCode } from '../lib/types'

const PILLARS: PillarCode[] = ['E', 'S', 'G', 'Other']

function tagStyle(color: string) {
  return { backgroundColor: `${color}1f`, color }
}

export default function TopicPanel({ paragraphs }: { paragraphs: ClassifiedParagraph[] }) {
  const [showTable, setShowTable] = useState(false)
  const [minConf, setMinConf] = useState(0)

  const { pillarData, topicData } = useMemo(() => {
    const pillarCount: Record<PillarCode, number> = { E: 0, S: 0, G: 0, Other: 0 }
    const topicCount: Record<string, { name: string; pillar: PillarCode; count: number }> = {}
    for (const p of paragraphs) {
      pillarCount[p.pillar] += 1
      const key = p.predicted_topic_id
      if (!topicCount[key])
        topicCount[key] = { name: p.predicted_topic, pillar: p.pillar, count: 0 }
      topicCount[key].count += 1
    }
    const pillarData = PILLARS.filter((p) => pillarCount[p] > 0).map((p) => ({
      name: PILLAR_LABEL[p],
      value: pillarCount[p],
      color: PILLAR_COLOR[p],
    }))
    const topicData = Object.values(topicCount)
      .sort((a, b) => b.count - a.count)
      .map((t) => ({ ...t, color: PILLAR_COLOR[t.pillar] }))
    return { pillarData, topicData }
  }, [paragraphs])

  const filtered = useMemo(
    () => paragraphs.filter((p) => p.confidence >= minConf),
    [paragraphs, minConf],
  )

  const barHeight = Math.max(160, topicData.length * 30 + 20)

  return (
    <div className="card">
      <h3 className="card-title">
        <span className="dot" style={{ background: PILLAR_COLOR.E, width: 10, height: 10, borderRadius: 3 }} />
        Topic classification
      </h3>
      <p className="card-sub">
        Each paragraph is classified by ESG topic with a fine-tuned transformer (≈0.75 accuracy).
        Pillar split on the left, topic distribution on the right.
      </p>

      <div className="grid-2">
        <div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={pillarData}
                dataKey="value"
                nameKey="name"
                innerRadius={58}
                outerRadius={90}
                paddingAngle={2}
                stroke="none"
                isAnimationActive={false}
              >
                {pillarData.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number, n: string) => [`${v} paragraphs`, n]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="legend">
            {pillarData.map((d) => (
              <span key={d.name}>
                <span className="dot" style={{ background: d.color }} />
                {d.name} ({d.value})
              </span>
            ))}
          </div>
        </div>

        <div>
          <ResponsiveContainer width="100%" height={barHeight}>
            <BarChart
              data={topicData}
              layout="vertical"
              margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                width={150}
                tick={{ fontSize: 11, fill: '#5a6776' }}
                interval={0}
              />
              <Tooltip
                cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                formatter={(v: number) => [`${v} paragraphs`, 'Count']}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={16} isAnimationActive={false}>
                {topicData.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <button className="collapse-btn" onClick={() => setShowTable((s) => !s)}>
          {showTable ? 'Hide' : 'Show'} per-paragraph detail ({paragraphs.length})
        </button>

        {showTable && (
          <div style={{ marginTop: 14 }}>
            <div className="table-tools">
              <div className="slider-wrap">
                <span>Min confidence</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={minConf}
                  onChange={(e) => setMinConf(parseFloat(e.target.value))}
                />
                <span className="mono">{Math.round(minConf * 100)}%</span>
                <span style={{ color: 'var(--ink-faint)' }}>
                  ({filtered.length} shown)
                </span>
              </div>
            </div>
            <div className="tbl-scroll">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 48 }}>Page</th>
                    <th style={{ width: 170 }}>Topic</th>
                    <th style={{ width: 70 }}>Conf.</th>
                    <th>Text</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.para_id}>
                      <td className="mono">{p.page}</td>
                      <td>
                        <span className="topic-tag" style={tagStyle(PILLAR_COLOR[p.pillar])}>
                          {p.predicted_topic}
                        </span>
                      </td>
                      <td className="mono">{Math.round(p.confidence * 100)}%</td>
                      <td className="snippet">
                        {p.text.length > 240 ? p.text.slice(0, 240) + '…' : p.text}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

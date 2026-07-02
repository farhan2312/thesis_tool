import { useMemo, useState } from 'react'
import { PILLAR_COLOR, PILLAR_LABEL } from '../lib/palette'
import type { ClassifiedParagraph, PillarCode } from '../lib/types'
import CardHead from './CardHead'
import FilterChips, { type ChipOption } from './FilterChips'
import HBars, { type HBarDatum } from './HBars'
import PillarDonut from './PillarDonut'

const PILLARS: PillarCode[] = ['E', 'S', 'G', 'Other']

function tagStyle(color: string) {
  return { backgroundColor: `${color}1f`, color }
}

export default function TopicPanel({ paragraphs }: { paragraphs: ClassifiedParagraph[] }) {
  const [pillar, setPillar] = useState<string>('all')
  const [showTable, setShowTable] = useState(false)
  const [minConf, setMinConf] = useState(0)
  const [query, setQuery] = useState('')

  const { pillarCount, pillarData, topicByPillar } = useMemo(() => {
    const pillarCount: Record<PillarCode, number> = { E: 0, S: 0, G: 0, Other: 0 }
    const topics: Record<string, { name: string; pillar: PillarCode; count: number }> = {}
    for (const p of paragraphs) {
      pillarCount[p.pillar] += 1
      if (!topics[p.predicted_topic_id])
        topics[p.predicted_topic_id] = { name: p.predicted_topic, pillar: p.pillar, count: 0 }
      topics[p.predicted_topic_id].count += 1
    }
    const pillarData = PILLARS.filter((p) => pillarCount[p] > 0).map((p) => ({
      name: PILLAR_LABEL[p],
      value: pillarCount[p],
      color: PILLAR_COLOR[p],
    }))
    return { pillarCount, pillarData, topicByPillar: topics }
  }, [paragraphs])

  const total = paragraphs.length

  const pillarOptions: ChipOption[] = [
    { key: 'all', label: 'All pillars', count: total },
    ...PILLARS.filter((p) => pillarCount[p] > 0).map((p) => ({
      key: p,
      label: PILLAR_LABEL[p],
      color: PILLAR_COLOR[p],
      count: pillarCount[p],
    })),
  ]

  const topicData: HBarDatum[] = useMemo(
    () =>
      Object.entries(topicByPillar)
        .filter(([, t]) => pillar === 'all' || t.pillar === pillar)
        .sort((a, b) => b[1].count - a[1].count)
        .map(([id, t]) => ({
          key: id,
          label: t.name,
          value: t.count,
          color: PILLAR_COLOR[t.pillar],
        })),
    [topicByPillar, pillar],
  )

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return paragraphs.filter(
      (p) =>
        (pillar === 'all' || p.pillar === pillar) &&
        p.confidence >= minConf &&
        (!q || p.text.toLowerCase().includes(q) || p.predicted_topic.toLowerCase().includes(q)),
    )
  }, [paragraphs, pillar, minConf, query])

  return (
    <div className="card">
      <CardHead
        step="A"
        title="Topic classification"
        tag="Component A"
        desc="A fine-tuned transformer labels every paragraph as one of 16 ESG topics, or other."
      />

      <FilterChips options={pillarOptions} value={pillar} onChange={setPillar} />

      <div className="topic-top">
        <div className="donut-block">
          <h4 className="subhead">Disclosure share by ESG pillar</h4>
          <div className="donut-wrap">
            <PillarDonut data={pillarData} centerValue={String(total)} centerLabel="paragraphs" />
          </div>
        </div>
        <div className="legend-block">
          <div className="pillar-legend">
            {pillarData.map((d) => (
              <div className="pillar-legend-row" key={d.name}>
                <span className="dot" style={{ background: d.color }} />
                <span className="pl-name">{d.name}</span>
                <span className="pl-val">
                  {d.value} · {Math.round((d.value / total) * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="topics-block">
        <h4 className="subhead">
          Paragraphs classified per ESG topic
          {pillar !== 'all' && (
            <span className="subhead-note"> · {PILLAR_LABEL[pillar as PillarCode]}</span>
          )}
        </h4>
        <HBars data={topicData} labelWidth={300} emptyText="No topics in this pillar." />
      </div>

      <div className="detail-block">
        <button className="collapse-btn" onClick={() => setShowTable((s) => !s)}>
          {showTable ? 'Hide' : 'Show'} per-paragraph detail ({total})
        </button>

        {showTable && (
          <div style={{ marginTop: 14 }}>
            <div className="table-tools">
              <input
                className="search"
                placeholder="Search paragraph text or topic…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
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
              </div>
              <span className="rowcount">{filteredRows.length} shown</span>
            </div>
            <div className="tbl-scroll">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 52 }}>Page</th>
                    <th style={{ width: 210 }}>Topic</th>
                    <th style={{ width: 74 }}>Conf.</th>
                    <th>Text</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((p) => (
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

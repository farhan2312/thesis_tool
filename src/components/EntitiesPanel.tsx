import { useMemo, useState } from 'react'
import { ENTITY_COLOR, ENTITY_LABEL } from '../lib/palette'
import type { Entity } from '../lib/types'
import CardHead from './CardHead'
import FilterChips, { type ChipOption } from './FilterChips'

const ORDER = ['FRAMEWORK', 'CERTIFICATION', 'TARGET_YEAR', 'LOCALIZATION', 'ASSURANCE', 'POLICY']

export default function EntitiesPanel({ entities }: { entities: Entity[] }) {
  const [type, setType] = useState('all')
  const [q, setQ] = useState('')

  const { byLabel, totals } = useMemo(() => {
    const byLabel: Record<string, Map<string, number>> = {}
    const totals: Record<string, number> = {}
    for (const e of entities) {
      if (!byLabel[e.label]) byLabel[e.label] = new Map()
      byLabel[e.label].set(e.text, (byLabel[e.label].get(e.text) ?? 0) + 1)
      totals[e.label] = (totals[e.label] ?? 0) + 1
    }
    return { byLabel, totals }
  }, [entities])

  const present = ORDER.filter((l) => byLabel[l])

  const typeOptions: ChipOption[] = [
    { key: 'all', label: 'All types', count: entities.length },
    ...present.map((l) => ({ key: l, label: ENTITY_LABEL[l], color: ENTITY_COLOR[l], count: totals[l] })),
  ]

  const shown = present.filter((l) => type === 'all' || l === type)
  const needle = q.trim().toLowerCase()

  if (entities.length === 0) {
    return (
      <div className="card">
        <CardHead
          step="C"
          title="Named entities"
          tag="Component C"
          desc="Non-numeric commitments and credentials: targets, certifications and framework references."
        />
        <p className="empty">No frameworks, certifications or targets were detected.</p>
      </div>
    )
  }

  return (
    <div className="card">
      <CardHead
        step="C"
        title="Named entities"
        tag="Component C"
        desc="Non-numeric commitments and credentials: targets, certifications and framework references."
      />

      <div className="stat-row">
        {present.map((l) => (
          <button
            key={l}
            className="stat stat-btn"
            onClick={() => setType(type === l ? 'all' : l)}
            style={type === l ? { background: `${ENTITY_COLOR[l]}12` } : undefined}
          >
            <span className="num" style={{ color: ENTITY_COLOR[l] }}>
              {totals[l]}
            </span>
            <span className="lbl">{ENTITY_LABEL[l]}</span>
          </button>
        ))}
      </div>

      <div className="table-tools" style={{ marginTop: 18 }}>
        <input
          className="search"
          placeholder="Search entities…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <FilterChips options={typeOptions} value={type} onChange={setType} />

      <div className="entity-groups">
        {shown.map((l) => {
          const items = [...byLabel[l].entries()]
            .filter(([text]) => !needle || text.toLowerCase().includes(needle))
            .sort((a, b) => b[1] - a[1])
          if (!items.length) return null
          return (
            <div className="entity-group" key={l}>
              <h4>
                <span className="dot" style={{ background: ENTITY_COLOR[l] }} />
                {ENTITY_LABEL[l]}
                <span className="eg-count">{items.length}</span>
              </h4>
              <div className="entity-tags">
                {items.map(([text, count]) => (
                  <span className="entity-tag" key={text}>
                    {text}
                    {count > 1 && <span className="count">×{count}</span>}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

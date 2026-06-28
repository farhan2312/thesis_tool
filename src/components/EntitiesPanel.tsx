import { useMemo } from 'react'
import { ENTITY_COLOR, ENTITY_LABEL } from '../lib/palette'
import type { Entity } from '../lib/types'

const ORDER = ['FRAMEWORK', 'CERTIFICATION', 'TARGET_YEAR', 'LOCALIZATION', 'ASSURANCE', 'POLICY']

export default function EntitiesPanel({ entities }: { entities: Entity[] }) {
  const { byLabel, totals } = useMemo(() => {
    const byLabel: Record<string, Map<string, number>> = {}
    const totals: Record<string, number> = {}
    for (const e of entities) {
      if (!byLabel[e.label]) byLabel[e.label] = new Map()
      const key = e.text
      byLabel[e.label].set(key, (byLabel[e.label].get(key) ?? 0) + 1)
      totals[e.label] = (totals[e.label] ?? 0) + 1
    }
    return { byLabel, totals }
  }, [entities])

  const present = ORDER.filter((l) => byLabel[l])

  if (entities.length === 0) {
    return (
      <div className="card">
        <h3 className="card-title">Named entities</h3>
        <p className="empty">No frameworks, certifications or targets were detected.</p>
      </div>
    )
  }

  return (
    <div className="card">
      <h3 className="card-title">Named entities</h3>
      <p className="card-sub">
        Frameworks, certifications, targets and commitments tagged by ontology pattern rules.
      </p>

      <div className="stat-row">
        {present.map((l) => (
          <div className="stat" key={l}>
            <span className="num" style={{ color: ENTITY_COLOR[l] }}>
              {totals[l]}
            </span>
            <span className="lbl">{ENTITY_LABEL[l]}</span>
          </div>
        ))}
      </div>

      <div className="entity-groups">
        {present.map((l) => {
          const items = [...byLabel[l].entries()].sort((a, b) => b[1] - a[1])
          return (
            <div className="entity-group" key={l}>
              <h4>
                <span className="dot" style={{ background: ENTITY_COLOR[l], width: 9, height: 9, borderRadius: 2 }} />
                {ENTITY_LABEL[l]}
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

import { COLORS, bandClass, bandColor } from '../lib/palette'
import type { GreenwashingResult } from '../lib/types'
import CardHead from './CardHead'

interface Signal {
  label: string
  weight: number
  value: number // 0..1
  points: number // weighted contribution to the 0-100 score
  color: string
}

export default function GreenwashingPanel({ gw }: { gw: GreenwashingResult }) {
  const signals: Signal[] = [
    { label: 'Claim vs evidence gap', weight: 0.45, value: gw.claim_gap, points: gw.contributions.gap, color: COLORS.red },
    { label: 'Vague language', weight: 0.25, value: gw.vague_norm, points: gw.contributions.vague, color: COLORS.amber },
    { label: 'Specificity deficit', weight: 0.2, value: gw.specificity_deficit, points: gw.contributions.specificity, color: COLORS.blue },
    { label: 'Assurance deficit', weight: 0.1, value: gw.assurance_deficit, points: gw.contributions.assurance, color: COLORS.purple },
  ]

  return (
    <div className="card">
      <CardHead
        step="D"
        title="Greenwashing screen"
        tag="Component D"
        desc="A transparent 0 to 100 triage score; higher means weaker support for the claims a report makes."
      />

      <div className="gw-grid">
        <div className="gw-left">
          <div>
            <span className="gw-score" style={{ color: bandColor(gw.band) }}>
              {gw.score}
            </span>
            <span className="gw-outof"> / 100</span>
          </div>
          <div style={{ marginTop: 10 }}>
            <span className={`chip ${bandClass(gw.band)}`}>{gw.band} risk</span>
          </div>
          <div className="gw-meta">
            <div>
              <strong>{gw.topics_discussed}</strong> topics discussed ·{' '}
              <strong>{gw.topics_substantiated}</strong> backed by figures
            </div>
            <div>
              Confidence weight <strong>{gw.confidence}</strong>
            </div>
            <div>{gw.vague_per_1k} vague terms / 1k words</div>
            <div>{gw.assurance_signals} assurance / framework signal(s)</div>
          </div>
        </div>

        <div className="gw-right">
          <h4 className="subhead">Four signals (points added to the score)</h4>
          <div className="component-list">
            {signals.map((s) => (
              <div className="component" key={s.label}>
                <span className="clabel">
                  {s.label}{' '}
                  <span style={{ color: 'var(--ink-faint)' }}>·{Math.round(s.weight * 100)}%</span>
                </span>
                <span className="cbar">
                  <span style={{ width: `${Math.round(s.value * 100)}%`, background: s.color }} />
                </span>
                <span className="cval">+{s.points.toFixed(1)}</span>
              </div>
            ))}
          </div>
          <p className="triage-note">
            Score = 0.45·gap + 0.25·vague + 0.20·specificity + 0.10·assurance (×100). A triage
            indicator that flags reports for review, never a verdict on a company.
          </p>
        </div>
      </div>
    </div>
  )
}

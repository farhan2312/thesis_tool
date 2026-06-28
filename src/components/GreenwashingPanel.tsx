import { COLORS, bandClass, bandColor } from '../lib/palette'
import type { GreenwashingResult } from '../lib/types'

interface Signal {
  label: string
  weight: number
  value: number // 0..1
  points: number // weighted contribution to the 0-100 score
  color: string
}

export default function GreenwashingPanel({ gw }: { gw: GreenwashingResult }) {
  const signals: Signal[] = [
    {
      label: 'Claim–evidence gap',
      weight: 0.45,
      value: gw.claim_gap,
      points: gw.contributions.gap,
      color: COLORS.red,
    },
    {
      label: 'Vague language',
      weight: 0.25,
      value: gw.vague_norm,
      points: gw.contributions.vague,
      color: COLORS.amber,
    },
    {
      label: 'Specificity deficit',
      weight: 0.2,
      value: gw.specificity_deficit,
      points: gw.contributions.specificity,
      color: COLORS.blue,
    },
    {
      label: 'Assurance deficit',
      weight: 0.1,
      value: gw.assurance_deficit,
      points: gw.contributions.assurance,
      color: COLORS.purple,
    },
  ]

  return (
    <div className="card">
      <h3 className="card-title">
        <span className="dot" style={{ background: bandColor(gw.band), width: 10, height: 10, borderRadius: 3 }} />
        Greenwashing score
      </h3>
      <p className="card-sub">
        A transparent disclosure-quality triage signal — higher means more narrative than
        substantiation. It is <strong>not</strong> a verdict on the company.
      </p>

      <div className="gw-top">
        <div>
          <span className="gw-score" style={{ color: bandColor(gw.band) }}>
            {gw.score}
          </span>
          <span className="gw-outof"> / 100</span>
          <div style={{ marginTop: 8 }}>
            <span className={`chip ${bandClass(gw.band)}`}>{gw.band} risk</span>
          </div>
        </div>
        <div className="gw-meta">
          <div>
            <strong>{gw.topics_discussed}</strong> topics discussed ·{' '}
            <strong>{gw.topics_substantiated}</strong> backed by figures
          </div>
          <div>
            Confidence weight <strong>{gw.confidence}</strong> · {gw.vague_per_1k} vague terms / 1k
            words
          </div>
          <div>{gw.assurance_signals} assurance / framework signal(s) detected</div>
        </div>
      </div>

      <div className="component-list">
        {signals.map((s) => (
          <div className="component" key={s.label}>
            <span className="clabel">
              {s.label} <span style={{ color: 'var(--ink-faint)' }}>·{Math.round(s.weight * 100)}%</span>
            </span>
            <span className="cbar">
              <span
                style={{ width: `${Math.round(s.value * 100)}%`, background: s.color }}
              />
            </span>
            <span className="cval">+{s.points.toFixed(1)}</span>
          </div>
        ))}
      </div>

      <p className="triage-note">
        Score = 0.45·gap + 0.25·vague + 0.20·specificity + 0.10·assurance (×100). The four
        right-hand numbers are the points each signal adds to the total.
      </p>
    </div>
  )
}

import type { Progress, Stage } from '../lib/types'

const STEPS: { key: Stage; label: string }[] = [
  { key: 'extracting', label: 'Extracting text' },
  { key: 'segmenting', label: 'Segmenting paragraphs' },
  { key: 'classifying', label: 'Classifying topics' },
  { key: 'metrics', label: 'Extracting figures' },
  { key: 'entities', label: 'Tagging entities' },
  { key: 'scoring', label: 'Greenwashing score' },
]

const ORDER: Stage[] = [
  'reading',
  'extracting',
  'segmenting',
  'classifying',
  'metrics',
  'entities',
  'scoring',
  'done',
]

function stageLabel(p: Progress): string {
  switch (p.stage) {
    case 'reading':
      return 'Reading the file locally…'
    case 'extracting':
      return p.total ? `Extracting text, page ${p.current} of ${p.total}` : 'Extracting text…'
    case 'segmenting':
      return 'Segmenting into paragraphs…'
    case 'classifying':
      return 'Classifying paragraphs by ESG topic…'
    case 'metrics':
      return 'Extracting quantitative figures…'
    case 'entities':
      return 'Tagging frameworks, certifications & targets…'
    case 'scoring':
      return 'Computing the greenwashing score…'
    case 'done':
      return 'Done.'
    default:
      return 'Working…'
  }
}

export default function ProgressView({ progress }: { progress: Progress }) {
  const idx = ORDER.indexOf(progress.stage)
  // Overall percentage: each major stage is a slice; classifying interpolates by paragraph.
  const stagesTotal = ORDER.length - 1
  let frac = idx / stagesTotal
  if (progress.stage === 'classifying' && progress.total) {
    const within = progress.current && progress.total ? progress.current / progress.total : 0
    frac = (ORDER.indexOf('classifying') + within) / stagesTotal
  }
  const pct = Math.round(Math.min(1, Math.max(0, frac)) * 100)

  const classCount =
    progress.stage === 'classifying' && progress.total
      ? `${progress.current ?? 0} / ${progress.total}`
      : ''

  return (
    <div className="card progress-wrap" style={{ marginTop: 28 }}>
      <div className="progress-row">
        <span className="progress-stage">{stageLabel(progress)}</span>
        <span className="progress-count">{classCount || `${pct}%`}</span>
      </div>
      <div className="bar">
        <span style={{ width: `${pct}%` }} />
      </div>
      <div className="steps">
        {STEPS.map((s) => {
          const sIdx = ORDER.indexOf(s.key)
          const cls = sIdx < idx ? 'done' : sIdx === idx ? 'active' : ''
          return (
            <span key={s.key} className={`step ${cls}`}>
              {s.label}
            </span>
          )
        })}
      </div>
    </div>
  )
}

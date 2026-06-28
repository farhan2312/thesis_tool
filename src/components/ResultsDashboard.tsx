import type { Backend } from '../lib/classify'
import type { PipelineResult } from '../lib/types'
import EntitiesPanel from './EntitiesPanel'
import GreenwashingPanel from './GreenwashingPanel'
import MetricsPanel from './MetricsPanel'
import TopicPanel from './TopicPanel'

interface Props {
  result: PipelineResult
  backend: Backend | null
  fileName: string
  onReset: () => void
}

export default function ResultsDashboard({ result, backend, fileName, onReset }: Props) {
  const { meta, stats } = result
  return (
    <div className="dashboard">
      <div className="results-head">
        <div className="file-badge">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--green)"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
          </svg>
          <span className="fname">{fileName}</span>
          <span style={{ color: 'var(--ink-faint)' }}>
            · {stats.pages} pages · {stats.paragraphs} paragraphs · {stats.words.toLocaleString()} words
            {meta.company && meta.company !== meta.doc_id ? ` · ${meta.company}` : ''}
            {meta.year ? ` ${meta.year}` : ''}
          </span>
          {backend && (
            <span
              className="chip"
              style={{ background: 'rgba(21,101,192,0.1)', color: 'var(--blue)' }}
            >
              {backend === 'webgpu' ? 'WebGPU' : 'WASM'}
            </span>
          )}
        </div>
        <button className="reset-link" onClick={onReset}>
          ← Analyse another PDF
        </button>
      </div>

      <TopicPanel paragraphs={result.paragraphs} />
      <div className="grid-2">
        <GreenwashingPanel gw={result.greenwashing} />
        <EntitiesPanel entities={result.entities} />
      </div>
      <MetricsPanel metrics={result.metrics} />
    </div>
  )
}

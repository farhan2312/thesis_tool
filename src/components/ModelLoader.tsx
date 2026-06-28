import type { Backend, ModelLoadProgress } from '../lib/classify'

interface Props {
  progress: ModelLoadProgress | null
  backend: Backend | null
  ready: boolean
}

export default function ModelLoader({ progress, backend, ready }: Props) {
  // Track the model weights file for the headline percentage.
  const isWeights = progress?.file?.includes('.onnx')
  const pct = progress ? progress.progress : 0
  const sizeNote =
    progress && progress.totalMb > 0
      ? `${progress.loadedMb} / ${progress.totalMb} MB`
      : 'downloading…'

  return (
    <div className="card progress-wrap" style={{ marginTop: 28 }}>
      <div className="progress-row">
        <span className="progress-stage">
          <span className="spinner" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 10 }} />
          {ready ? 'Model ready' : 'Loading the in-browser classifier…'}
        </span>
        <span className="progress-count">{isWeights ? sizeNote : `${pct}%`}</span>
      </div>
      <div className="bar">
        <span style={{ width: `${ready ? 100 : pct}%` }} />
      </div>
      <p className="card-sub" style={{ margin: '14px 0 0' }}>
        The fine-tuned ESG classifier (~80&nbsp;MB, int8) downloads <strong>once</strong> and is then
        cached by your browser — subsequent loads are instant. It runs on{' '}
        <strong>{backend === 'webgpu' ? 'WebGPU' : backend === 'wasm' ? 'WebAssembly' : 'WebGPU / WebAssembly'}</strong>,
        entirely on your device.
      </p>
    </div>
  )
}

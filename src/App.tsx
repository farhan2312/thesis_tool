import { useEffect, useRef, useState } from 'react'
import Dropzone from './components/Dropzone'
import ModelLoader from './components/ModelLoader'
import ProgressView from './components/Progress'
import ResultsDashboard from './components/ResultsDashboard'
import { loadClassifier, type Backend, type Classifier, type ModelLoadProgress } from './lib/classify'
import { analyzePdf } from './lib/pipeline'
import type { PipelineResult, Progress } from './lib/types'

export default function App() {
  const [classifier, setClassifier] = useState<Classifier | null>(null)
  const [modelProgress, setModelProgress] = useState<ModelLoadProgress | null>(null)
  const [backend, setBackend] = useState<Backend | null>(null)
  const [modelError, setModelError] = useState<string | null>(null)

  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [result, setResult] = useState<PipelineResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const started = useRef(false)

  useEffect(() => {
    if (started.current) return // guard against StrictMode double-mount
    started.current = true
    loadClassifier(setModelProgress)
      .then((c) => {
        setClassifier(c)
        setBackend(c.backend)
      })
      .catch((e: unknown) => setModelError(e instanceof Error ? e.message : String(e)))
  }, [])

  async function handleFile(f: File) {
    if (!classifier) return
    setFile(f)
    setResult(null)
    setError(null)
    setProgress({ stage: 'reading' })
    try {
      const r = await analyzePdf(f, classifier, setProgress)
      if (r.stats.paragraphs === 0) {
        setError(
          'No extractable text was found in this PDF. It may be a scanned / image-only document — OCR is outside this in-browser tool.',
        )
        setProgress(null)
        return
      }
      setResult(r)
      setProgress(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
      setProgress(null)
    }
  }

  function reset() {
    setFile(null)
    setResult(null)
    setError(null)
    setProgress(null)
  }

  const modelReady = !!classifier
  const analyzing = !!progress && !result

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1 className="app-title">
            ESG Report Analysis <span className="accent">in your browser</span>
          </h1>
          <p className="app-subtitle">
            Drop a MENA oil &amp; gas sustainability PDF. It is parsed, classified by ESG topic,
            mined for figures and entities, and scored for greenwashing — all client-side, with a
            fine-tuned transformer running on WebGPU / WebAssembly.
          </p>
        </div>
        <span className="privacy-pill">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          File never leaves your device
        </span>
      </header>

      {modelError && (
        <div className="error-box">
          <strong>Could not load the classifier model.</strong>
          <div style={{ marginTop: 6 }}>{modelError}</div>
        </div>
      )}

      {!modelReady && !modelError && (
        <ModelLoader progress={modelProgress} backend={backend} ready={false} />
      )}

      {modelReady && !analyzing && !result && (
        <>
          <Dropzone onFile={handleFile} />
          {error && (
            <div className="error-box">
              <strong>Analysis stopped.</strong>
              <div style={{ marginTop: 6 }}>{error}</div>
            </div>
          )}
        </>
      )}

      {analyzing && progress && (
        <>
          {file && (
            <div style={{ marginTop: 24 }}>
              <span className="file-badge">
                <span className="spinner" />
                <span className="fname">{file.name}</span>
              </span>
            </div>
          )}
          <ProgressView progress={progress} />
        </>
      )}

      {result && (
        <ResultsDashboard
          result={result}
          backend={backend}
          fileName={file?.name ?? result.meta.doc_id}
          onReset={reset}
        />
      )}

      <footer className="footer-note">
        Runs entirely in your browser. Your file never leaves your device. · Classifier ≈0.75 gold
        accuracy (the deliberate trade for a zero-infrastructure, fully private tool); figure
        extraction, NER and the greenwashing score are deterministic ports of the dissertation
        pipeline.
      </footer>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import Dropzone from './components/Dropzone'
import ModelLoader from './components/ModelLoader'
import ProgressView from './components/Progress'
import ResultsDashboard from './components/ResultsDashboard'
import { loadClassifier, type Backend, type Classifier, type ModelLoadProgress } from './lib/classify'
import { analyzePdf } from './lib/pipeline'
import type { PipelineResult, Progress } from './lib/types'

const FULL_TITLE = 'AI-Driven ESG Compliance Analysis for the MENA Oil & Gas Supply Chain'
const TAGLINE = 'Automated, regionally aware analysis of supplier ESG reports, right in your browser.'
const SUMMARY =
  "Drop in a supplier's ESG or sustainability report and this tool reads it the way the research " +
  'framework does: it classifies the text by ESG topic, pulls out the reported figures and ' +
  'commitments, and flags the gap between what a report claims and what it actually backs up with ' +
  'evidence. Everything runs locally in your browser, so your file never leaves your device.'
const ABOUT =
  'This tool is a proof of concept from a Master of Engineering dissertation at the University of ' +
  'Wollongong. The research addresses a practical problem in the Middle East and North Africa oil ' +
  'and gas sector: the ESG performance data that National Oil Companies need to govern their supply ' +
  'chains, especially Scope 3 emissions, is locked inside thousands of unstructured, inconsistently ' +
  'formatted PDF reports that cannot be compared at scale. The framework pairs a domain-specific ESG ' +
  'ontology (anchored to GRI 11 and SASB, and enriched with regional terms such as ICV and IKTVA) ' +
  'with a hybrid NLP pipeline: a fine-tuned transformer classifies each paragraph into one of ' +
  'sixteen ESG topics, rule-based extraction recovers the quantitative figures, entity recognition ' +
  'captures commitments and certifications, and a transparent score flags likely greenwashing. It ' +
  'turns unstructured disclosure into structured, comparable, auditable data. This browser version ' +
  'runs a lightweight model for speed and privacy; the full study reports higher accuracy from a ' +
  'larger ensemble.'

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
          'No extractable text was found in this PDF. It may be a scanned or image-only document, and OCR is outside this in-browser tool.',
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
  const landing = !analyzing && !result

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand-block">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </span>
            <span className="brand-name">
              <span className="accent">ESG</span>scope
            </span>
          </div>
          <h1 className="app-title">{FULL_TITLE}</h1>
        </div>
        <span className="privacy-pill">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          File never leaves your device
        </span>
      </header>

      {landing && (
        <div className="hero">
          <p className="hero-tagline">{TAGLINE}</p>
          <p className="hero-summary">{SUMMARY}</p>
        </div>
      )}

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

      {landing && (
        <section className="about-card">
          <h2 className="about-title">About this research</h2>
          <p className="about-text">{ABOUT}</p>
        </section>
      )}

      <footer className="footer-note">
        <p className="attribution">
          Mohammed Farhan · ENGG940 Master&apos;s Dissertation · University of Wollongong ·
          Supervisor: Dr. Hazem Gouda
        </p>
        <p>
          Runs entirely in your browser. Your file never leaves your device. Classifier accuracy is
          about 0.75 in this browser build; figure extraction, entity recognition and the
          greenwashing score are deterministic ports of the dissertation pipeline.
        </p>
      </footer>
    </div>
  )
}

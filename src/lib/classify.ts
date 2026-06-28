import { pipeline, env, type ProgressInfo } from '@huggingface/transformers'
import type { LoadedOntology } from './ontology'
import { displayName } from './ontology'
import type { ClassifiedParagraph, Paragraph, PillarCode } from './types'

// The exact label order used at training time: sorted(unique gold_topic_id).
// The exported config.json already maps these as id2label, but we keep the array as a
// source of truth and to recover from a "LABEL_n" fallback if a config is ever stale.
export const LABELS = [
  'E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'G1', 'G2', 'G3', 'G4',
  'OTHER', 'S1', 'S2', 'S3', 'S4', 'S5', 'X1',
] as const

const MODEL_ID = 'esg-distilbert'
const BATCH = 16

// Configure transformers.js for a fully local, offline, same-origin setup.
env.allowLocalModels = true
env.allowRemoteModels = false
env.localModelPath = '/models/'
// Self-hosted onnxruntime-web WASM (COEP-safe, no CDN at runtime).
if (env.backends?.onnx?.wasm) {
  env.backends.onnx.wasm.wasmPaths = '/ort/'
}

export type Backend = 'webgpu' | 'wasm'

export interface ModelLoadProgress {
  file: string
  progress: number // 0..100
  loadedMb: number
  totalMb: number
}

export interface Classifier {
  backend: Backend
  classify: (
    paragraphs: Paragraph[],
    ont: LoadedOntology,
    onProgress?: (done: number, total: number) => void,
  ) => Promise<ClassifiedParagraph[]>
}

function normalizeLabel(label: string): string {
  if ((LABELS as readonly string[]).includes(label)) return label
  const m = /^LABEL_(\d+)$/.exec(label)
  if (m) return LABELS[Number(m[1])] ?? 'OTHER'
  return label
}

function pillarOfId(ont: LoadedOntology, id: string): PillarCode {
  return ont.pillarOf(id)
}

/** Load the classifier once. Tries WebGPU, falls back to WASM on any failure. */
export async function loadClassifier(
  onModelProgress?: (p: ModelLoadProgress) => void,
): Promise<Classifier> {
  const progress_callback = (info: ProgressInfo) => {
    if (info.status === 'progress' && 'file' in info) {
      const total = (info as { total?: number }).total ?? 0
      const loaded = (info as { loaded?: number }).loaded ?? 0
      onModelProgress?.({
        file: info.file,
        progress: Math.round(info.progress ?? 0),
        loadedMb: +(loaded / 1e6).toFixed(1),
        totalMb: +(total / 1e6).toFixed(1),
      })
    }
  }

  const hasWebGPU =
    typeof navigator !== 'undefined' && 'gpu' in navigator && !!(navigator as { gpu?: unknown }).gpu

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pipe: any
  let backend: Backend = 'wasm'

  if (hasWebGPU) {
    try {
      pipe = await pipeline('text-classification', MODEL_ID, {
        device: 'webgpu',
        dtype: 'q8',
        progress_callback,
      })
      // Warm-up: forces graph compilation so a WebGPU failure surfaces here, not mid-run.
      await pipe('warm up', { top_k: 1 })
      backend = 'webgpu'
    } catch (e) {
      console.warn('WebGPU classifier unavailable, falling back to WASM:', e)
      pipe = undefined
    }
  }

  if (!pipe) {
    pipe = await pipeline('text-classification', MODEL_ID, {
      device: 'wasm',
      dtype: 'q8',
      progress_callback,
    })
    backend = 'wasm'
  }

  const classify = async (
    paragraphs: Paragraph[],
    ont: LoadedOntology,
    onProgress?: (done: number, total: number) => void,
  ): Promise<ClassifiedParagraph[]> => {
    const out: ClassifiedParagraph[] = []
    const total = paragraphs.length
    for (let i = 0; i < total; i += BATCH) {
      const batch = paragraphs.slice(i, i + BATCH)
      const texts = batch.map((p) => p.text)
      const raw = await pipe(texts, { top_k: 1 })
      // Normalize: with top_k=1 each input yields {label, score} (possibly wrapped in an array).
      const results: { label: string; score: number }[] = (Array.isArray(raw) ? raw : [raw]).map(
        (r: unknown) => (Array.isArray(r) ? r[0] : r) as { label: string; score: number },
      )
      batch.forEach((p, j) => {
        const r = results[j]
        const id = normalizeLabel(r?.label ?? 'OTHER')
        out.push({
          ...p,
          predicted_topic_id: id,
          predicted_topic: displayName(ont, id),
          pillar: pillarOfId(ont, id),
          confidence: +(r?.score ?? 0).toFixed(3),
        })
      })
      onProgress?.(Math.min(i + BATCH, total), total)
    }
    return out
  }

  return { backend, classify }
}

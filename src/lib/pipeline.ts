// Orchestrates the full in-browser analysis:
//   pdf -> segment -> classify -> metrics -> ner -> greenwashing -> result
// Everything runs client-side; the file is never uploaded.

import type { Classifier } from './classify'
import { computeGreenwashing } from './greenwashing'
import { extractMetrics } from './metrics'
import { extractEntities } from './ner'
import { loadOntology } from './ontology'
import { extractPdf, parseName } from './pdf'
import { clean, segment } from './segment'
import type { Paragraph, PipelineResult, Progress } from './types'

function wordCount(s: string): number {
  return s.split(/\s+/).filter(Boolean).length
}

export async function analyzePdf(
  file: File,
  classifier: Classifier,
  onProgress: (p: Progress) => void,
): Promise<PipelineResult> {
  const ont = await loadOntology()
  const meta = parseName(file.name)

  // 1. Read bytes (locally)
  onProgress({ stage: 'reading' })
  const buf = await file.arrayBuffer()

  // 2. Extract text per page
  onProgress({ stage: 'extracting' })
  const { pages, numPages } = await extractPdf(buf, (page, total) =>
    onProgress({ stage: 'extracting', current: page, total }),
  )

  // 3. Segment into paragraphs (clean + segment per page, para_id increments across the doc)
  onProgress({ stage: 'segmenting' })
  const paragraphs: Paragraph[] = []
  let pid = 0
  for (const { page, text } of pages) {
    for (const para of segment(clean(text))) {
      pid += 1
      paragraphs.push({ page, para_id: pid, n_words: wordCount(para), text: para })
    }
  }

  // 4. Classify each paragraph
  onProgress({ stage: 'classifying', current: 0, total: paragraphs.length })
  const classified = await classifier.classify(paragraphs, ont, (done, total) =>
    onProgress({ stage: 'classifying', current: done, total }),
  )

  // 5. Regex figure extraction (classifier-aware)
  onProgress({ stage: 'metrics' })
  const metrics = extractMetrics(classified, ont, meta)

  // 6. Ontology pattern NER
  onProgress({ stage: 'entities' })
  const entities = extractEntities(classified)

  // 7. Greenwashing score
  onProgress({ stage: 'scoring' })
  const greenwashing = computeGreenwashing(classified, metrics, ont)

  onProgress({ stage: 'done' })

  const words = paragraphs.reduce((a, p) => a + p.n_words, 0)
  return {
    meta,
    paragraphs: classified,
    metrics,
    entities,
    greenwashing,
    stats: { pages: numPages, paragraphs: paragraphs.length, words },
  }
}

// Port of 5_greenwashing.py: transparent disclosure-quality risk score (0-100).
// Combines four signals with the ontology weights; same caps and Low/Moderate/High bands.

import type { LoadedOntology } from './ontology'
import type { ClassifiedParagraph, GreenwashingResult, Metric, RiskBand } from './types'

// Tunable caps for normalisation (per 1,000 words), identical to the Python.
const CAP_VAGUE = 15.0
const CAP_QUANT = 3.0
const MIN_TOPIC_PARAS = 2

/** Non-overlapping substring count, matching Python's str.count(). */
function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0
  return haystack.split(needle).length - 1
}

export function computeGreenwashing(
  paragraphs: ClassifiedParagraph[],
  metrics: Metric[],
  ont: LoadedOntology,
): GreenwashingResult {
  const gw = ont.raw.greenwashing_lexicon
  const sm = gw.scoring_model
  const W: Record<string, number> = {}
  for (const c of sm.components) W[c.name] = c.weight
  const w_gap = W['claim_substantiation_gap'] ?? 0.45
  const w_vague = W['vague_language_density'] ?? 0.25
  const w_spec = W['specificity_deficit'] ?? 0.2
  const w_assur = W['assurance_deficit'] ?? 0.1

  const vague_terms = [
    ...gw.aspirational_vague_terms,
    ...gw.hedging_terms,
    ...gw.commitment_cues_future,
  ].map((t) => t.toLowerCase())
  const assur_terms = gw.evidence_signals.assurance_transparency.map((t) => t.toLowerCase())

  // words + lowercased text blob
  let wc = 0
  const blobParts: string[] = []
  for (const p of paragraphs) {
    wc += p.n_words || 0
    blobParts.push(p.text.toLowerCase())
  }
  wc = Math.max(wc, 1)
  const blob = blobParts.join(' ')

  // discussed topics: predicted topic (non-OTHER) with >= MIN_TOPIC_PARAS paragraphs
  const discussedCount: Record<string, number> = {}
  for (const p of paragraphs) {
    if (p.predicted_topic_id !== 'OTHER') {
      discussedCount[p.predicted_topic_id] = (discussedCount[p.predicted_topic_id] ?? 0) + 1
    }
  }
  const disc = new Set(
    Object.entries(discussedCount)
      .filter(([, n]) => n >= MIN_TOPIC_PARAS)
      .map(([t]) => t),
  )

  // substantiated topics + metric count
  const sub = new Set<string>()
  for (const m of metrics) sub.add(m.topic_id)
  const n_metrics = metrics.length

  // claim-substantiation gap
  let discMinusSub = 0
  for (const t of disc) if (!sub.has(t)) discMinusSub++
  const gap = disc.size ? discMinusSub / disc.size : 0.0

  // vague-language density
  let vague = 0
  for (const t of vague_terms) vague += countOccurrences(blob, t)
  const vague_density = (vague / wc) * 1000
  const vague_norm = Math.min(1.0, vague_density / CAP_VAGUE)

  // specificity deficit
  const quant_density = (n_metrics / wc) * 1000
  const spec_deficit = 1.0 - Math.min(1.0, quant_density / CAP_QUANT)

  // assurance deficit
  let assur = 0
  for (const t of assur_terms) assur += countOccurrences(blob, t)
  const assur_deficit = assur === 0 ? 1.0 : assur < 3 ? 0.5 : 0.0

  const rawScore =
    100 * (w_gap * gap + w_vague * vague_norm + w_spec * spec_deficit + w_assur * assur_deficit)
  const score = Math.round(rawScore * 10) / 10
  const band: RiskBand = score <= 30 ? 'Low' : score <= 60 ? 'Moderate' : 'High'

  return {
    score,
    confidence: Math.round((100 - score) * 10) / 10,
    band,
    words: wc,
    topics_discussed: disc.size,
    topics_substantiated: sub.size,
    claim_gap: Math.round(gap * 100) / 100,
    vague_per_1k: Math.round(vague_density * 100) / 100,
    vague_norm,
    specificity_deficit: Math.round(spec_deficit * 100) / 100,
    assurance_signals: assur,
    assurance_deficit: assur_deficit,
    contributions: {
      gap: 100 * w_gap * gap,
      vague: 100 * w_vague * vague_norm,
      specificity: 100 * w_spec * spec_deficit,
      assurance: 100 * w_assur * assur_deficit,
    },
  }
}

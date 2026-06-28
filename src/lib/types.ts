// Shared types for the in-browser ESG analysis pipeline.

export type PillarCode = 'E' | 'S' | 'G' | 'Other'

/** A raw ontology topic as it appears in ontology.json. */
export interface OntologyTopic {
  id: string
  pillar: 'Environmental' | 'Social' | 'Governance'
  topic: string
  gri?: string[]
  sasb?: string[]
  quantitative: boolean
  metric_family: string
  units?: string[]
  metric_examples?: string[]
  keywords: string[]
  note?: string
  synonym_cluster?: unknown
}

export interface Ontology {
  name: string
  version: string
  topics: OntologyTopic[]
  region_specific: unknown
  greenwashing_lexicon: {
    aspirational_vague_terms: string[]
    commitment_cues_future: string[]
    hedging_terms: string[]
    evidence_signals: {
      quantitative_substantiation: string[]
      assurance_transparency: string[]
    }
    scoring_model: {
      components: { name: string; weight: number; definition: string }[]
      [k: string]: unknown
    }
    [k: string]: unknown
  }
  [k: string]: unknown
}

/** Document-level metadata parsed from the filename (mirrors parse_name in 1_extract_text.py). */
export interface DocMeta {
  doc_id: string
  company: string
  year: string
  report_type: string
}

/** One segmented paragraph (mirrors a row of paragraphs.csv). */
export interface Paragraph {
  page: number
  para_id: number
  n_words: number
  text: string
}

/** A classified paragraph (mirrors classified_paragraphs.csv). */
export interface ClassifiedParagraph extends Paragraph {
  predicted_topic_id: string // E1..X1 or OTHER
  predicted_topic: string // display name
  pillar: PillarCode
  confidence: number // 0..1
}

/** One extracted quantitative figure (mirrors extracted_metrics_refined.csv). */
export interface Metric {
  topic_id: string
  topic: string
  metric_family: string
  pattern: string // family key: emissions, energy, ...
  match_text: string
  value_num: number | null
  unit: string
  page: number
  para_id: number
  predicted_topic: string
  attribution_method: string // classifier | unit-primary | keyword-fallback
  snippet: string
}

/** One named entity (mirrors entities.csv). */
export interface Entity {
  page: number
  label: string // CERTIFICATION | TARGET_YEAR | FRAMEWORK | LOCALIZATION | ASSURANCE | POLICY
  text: string
}

export type RiskBand = 'Low' | 'Moderate' | 'High'

/** Per-report greenwashing result (mirrors a row of greenwashing_scores.csv). */
export interface GreenwashingResult {
  score: number // 0..100, higher = worse
  confidence: number // 100 - score
  band: RiskBand
  words: number
  topics_discussed: number
  topics_substantiated: number
  claim_gap: number // 0..1
  vague_per_1k: number
  vague_norm: number // 0..1
  specificity_deficit: number // 0..1
  assurance_signals: number
  assurance_deficit: number // 0..1
  // weighted contributions to the final score (each already x100 x weight)
  contributions: { gap: number; vague: number; specificity: number; assurance: number }
}

export interface PipelineResult {
  meta: DocMeta
  paragraphs: ClassifiedParagraph[]
  metrics: Metric[]
  entities: Entity[]
  greenwashing: GreenwashingResult
  stats: {
    pages: number
    paragraphs: number
    words: number
  }
}

export type Stage =
  | 'idle'
  | 'reading'
  | 'extracting'
  | 'segmenting'
  | 'classifying'
  | 'metrics'
  | 'entities'
  | 'scoring'
  | 'done'

export interface Progress {
  stage: Stage
  /** for the classifying stage: paragraphs processed so far / total */
  current?: number
  total?: number
}

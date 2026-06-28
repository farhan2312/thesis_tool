import type { Ontology, OntologyTopic, PillarCode } from './types'

let cached: LoadedOntology | null = null

export interface LoadedOntology {
  raw: Ontology
  topics: OntologyTopic[]
  byId: Record<string, OntologyTopic>
  /** topic id -> display name */
  name: Record<string, string>
  /** topic id -> metric family */
  family: Record<string, string>
  /** topic id -> lowercased keyword list */
  keywords: Record<string, string[]>
  /** ids of quantitative topics (quantitative === true) */
  quantitativeIds: string[]
  /** topic id -> pillar code E/S/G/Other */
  pillarOf: (id: string) => PillarCode
}

function pillarCode(pillar: string | undefined): PillarCode {
  switch (pillar) {
    case 'Environmental':
      return 'E'
    case 'Social':
      return 'S'
    case 'Governance':
      return 'G'
    default:
      return 'Other'
  }
}

/** Fetch and index ontology.json (served as a static asset). Cached after first call. */
export async function loadOntology(): Promise<LoadedOntology> {
  if (cached) return cached
  const res = await fetch('/ontology.json')
  if (!res.ok) throw new Error(`Failed to load ontology.json (${res.status})`)
  const raw = (await res.json()) as Ontology

  const byId: Record<string, OntologyTopic> = {}
  const name: Record<string, string> = {}
  const family: Record<string, string> = {}
  const keywords: Record<string, string[]> = {}
  const quantitativeIds: string[] = []

  for (const t of raw.topics) {
    byId[t.id] = t
    name[t.id] = t.topic
    family[t.id] = t.metric_family
    keywords[t.id] = (t.keywords || []).map((k) => k.toLowerCase())
    if (t.quantitative) quantitativeIds.push(t.id)
  }

  cached = {
    raw,
    topics: raw.topics,
    byId,
    name,
    family,
    keywords,
    quantitativeIds,
    pillarOf: (id: string) => (id === 'OTHER' ? 'Other' : pillarCode(byId[id]?.pillar)),
  }
  return cached
}

/** Display label for a topic id, including the OTHER/boilerplate case (mirrors disp() in 3_classify.py). */
export function displayName(ont: LoadedOntology, id: string): string {
  if (id === 'OTHER') return 'Other/boilerplate'
  return ont.name[id] ?? id
}

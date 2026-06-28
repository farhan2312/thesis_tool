// Port of 2b_extract_metrics_refined.py — classifier-aware quantitative extraction.
// The four regex families and the attribution logic are reproduced exactly; each figure
// is attributed to the paragraph's predicted topic (the refinement over 2_extract_metrics.py).

import type { LoadedOntology } from './ontology'
import type { ClassifiedParagraph, DocMeta, Metric } from './types'

const MULT: Record<string, number> = {
  thousand: 1e3,
  million: 1e6,
  mn: 1e6,
  billion: 1e9,
  bn: 1e9,
  trillion: 1e12,
}

function num(s: string | undefined, mult?: string | null): number | null {
  if (s == null) return null
  let v: number
  try {
    v = parseFloat(s.replace(/,/g, '').replace(/ /g, ''))
  } catch {
    return null
  }
  if (Number.isNaN(v)) return null
  if (mult && MULT[mult.toLowerCase()]) v *= MULT[mult.toLowerCase()]
  return v
}

// NUM = r"\d{1,3}(?:[,\s]\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?"
const NUM = String.raw`\d{1,3}(?:[,\s]\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?`

interface Family {
  fam: string
  rx: RegExp
}

// Patterns mirror PATTERNS in the Python (case-insensitive, global for finditer semantics).
const PATTERNS: Family[] = [
  {
    fam: 'emissions',
    rx: new RegExp(
      `(${NUM})\\s*(million|thousand|billion|bn|mn)?\\s*(tco2e|t\\s?co2e|ktco2e|mtco2e|mtco2|tco2|co2e|co2-?e|tonnes?\\s+co2e?|metric\\s+tons?\\s+(?:of\\s+)?co2e?)`,
      'gi',
    ),
  },
  { fam: 'energy', rx: new RegExp(`(${NUM})\\s*(gj|tj|pj|mwh|gwh|kwh|mmbtu)\\b`, 'gi') },
  {
    fam: 'volume',
    // Trailing boundary is (?!\w) rather than \b: identical to \b for the ASCII-ending
    // units, but unlike JS's ASCII-only \b it also matches "m³" before a space — Python's
    // Unicode \b treats the superscript ³ as a word char, so m³\b matches there.
    rx: new RegExp(
      `(${NUM})\\s*(million\\s*m3|thousand\\s*m3|m3|m³|ml|megalit\\w+|barrels|bbl)(?!\\w)`,
      'gi',
    ),
  },
  {
    fam: 'safety_rate',
    rx: new RegExp(
      `(${NUM})\\s*(per\\s*(?:200[, ]?000|1[, ]?000[, ]?000|million)\\s*(?:man[- ]?)?hours?)`,
      'gi',
    ),
  },
  {
    fam: 'safety_named',
    rx: new RegExp(
      `(ltifr?|ltir|trir|trif|far|lost time injury (?:frequency|rate))\\b[^\\d%]{0,25}(${NUM})`,
      'gi',
    ),
  },
  {
    fam: 'money',
    rx: new RegExp(
      `(?:\\$|us\\$|usd|sar|aed|qar)\\s?(${NUM})\\s*(billion|bn|million|mn|trillion)?`,
      'gi',
    ),
  },
  { fam: 'mass', rx: new RegExp(`(${NUM})\\s*(tonnes?|metric\\s+tons?|kg)\\b`, 'gi') },
  { fam: 'percent', rx: new RegExp(`(${NUM})\\s*(%|per\\s?cent|percent)\\b`, 'gi') },
  {
    fam: 'target_year',
    rx: new RegExp(`(net[- ]?zero|carbon\\s+neutral)\\D{0,40}(20[2-6]\\d)`, 'gi'),
  },
]

const FAMILY_PRIMARY: Record<string, string> = {
  emissions: 'E1',
  energy: 'E2',
  volume: 'E4',
  mass: 'E5',
  safety_rate: 'S1',
  safety_named: 'S1',
  target_year: 'X1',
}
const FAMILY_CANDS: Record<string, Set<string>> = {
  emissions: new Set(['E1', 'E3', 'X1']),
  energy: new Set(['E2']),
  volume: new Set(['E4']),
  mass: new Set(['E5']),
  safety_rate: new Set(['S1']),
  safety_named: new Set(['S1']),
  target_year: new Set(['X1']),
}
const AMBIG = new Set(['percent', 'money'])

/** nearest(tl, pos, cands): topic whose keyword occurs closest to pos. Port of nearest(). */
function nearest(
  ont: LoadedOntology,
  tl: string,
  pos: number,
  cands: string[],
): string | null {
  let best: string | null = null
  let bestd = 1e9
  for (const t of cands) {
    for (const kw of ont.keywords[t] ?? []) {
      let i = tl.indexOf(kw)
      while (i !== -1) {
        const d = Math.abs(i - pos)
        if (d < bestd) {
          bestd = d
          best = t
        }
        i = tl.indexOf(kw, i + 1)
      }
    }
  }
  return best
}

export function extractMetrics(
  paragraphs: ClassifiedParagraph[],
  ont: LoadedOntology,
  meta: DocMeta,
): Metric[] {
  void meta // doc-level fields are carried at the result level; kept for signature parity
  const Q = new Set(ont.quantitativeIds) // quantitative topic ids
  const rows: Metric[] = []

  for (const p of paragraphs) {
    const text = p.text
    const tl = text.toLowerCase()
    const P = p.predicted_topic_id

    for (const { fam, rx } of PATTERNS) {
      rx.lastIndex = 0
      for (const m of text.matchAll(rx)) {
        const start = m.index ?? 0
        let raw: string
        let val: number | null
        let unit: string

        if (fam === 'safety_named') {
          raw = m[0]
          val = num(m[2])
          unit = (m[1] ?? '').toUpperCase()
        } else if (fam === 'target_year') {
          raw = m[0]
          val = num(m[2])
          unit = 'target year'
        } else if (fam === 'percent') {
          raw = m[0]
          val = num(m[1])
          unit = '%'
        } else if (fam === 'money') {
          raw = m[0]
          val = num(m[1], m[2])
          unit = 'currency'
        } else if (fam === 'emissions') {
          raw = m[0]
          val = num(m[1], m[2])
          unit = m[3] ?? ''
        } else {
          // energy, volume, mass, safety_rate
          raw = m[0]
          val = num(m[1])
          unit = m[2] ?? ''
        }

        let topic: string
        let method: string
        if (AMBIG.has(fam)) {
          if (Q.has(P)) {
            topic = P
            method = 'classifier'
          } else {
            const present = ont.quantitativeIds.filter((t) =>
              (ont.keywords[t] ?? []).some((kw) => tl.includes(kw)),
            )
            const t = nearest(ont, tl, start, present)
            if (!t) continue
            topic = t
            method = 'keyword-fallback'
          }
        } else {
          const cands = FAMILY_CANDS[fam]
          if (cands.has(P)) {
            topic = P
            method = 'classifier'
          } else {
            topic = FAMILY_PRIMARY[fam]
            method = 'unit-primary'
          }
        }

        const snip = text
          .slice(Math.max(0, start - 80), start + 90)
          .split(/\s+/)
          .filter(Boolean)
          .join(' ')

        rows.push({
          topic_id: topic,
          topic: ont.name[topic] ?? topic,
          metric_family: ont.family[topic] ?? '',
          pattern: fam,
          match_text: raw.trim(),
          value_num: val,
          unit,
          page: p.page,
          para_id: p.para_id,
          predicted_topic: P || '',
          attribution_method: method,
          snippet: snip,
        })
      }
    }
  }
  return rows
}

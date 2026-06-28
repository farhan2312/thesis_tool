// Port of the cleaning + paragraph segmentation in 1_extract_text.py.
// Behaviour is kept identical to the Python so the in-browser corpus matches paragraphs.csv.

/** Word count the way Python does it: len(s.split()) over whitespace. */
function wordCount(s: string): number {
  if (!s) return 0
  const parts = s.split(/\s+/).filter((p) => p.length > 0)
  return parts.length
}

/** Collapse all whitespace runs to single spaces: " ".join(s.split()). */
function collapseWs(s: string): string {
  return s.split(/\s+/).filter((p) => p.length > 0).join(' ')
}

/**
 * Port of clean(text): strip bare page numbers and "page x of y" / "x / y" lines,
 * preserve blank lines (used as paragraph separators by segment()).
 */
export function clean(text: string): string {
  const lines: string[] = []
  for (const l of text.split('\n')) {
    const s = l.trim()
    if (!s) {
      lines.push('')
      continue
    }
    if (/^\d{1,4}$/.test(s)) continue // bare page number
    if (/^(?:page\s*)?\d+\s*(?:of|\/)\s*\d+$/i.test(s)) continue // "page x of y" / "x / y"
    lines.push(s)
  }
  return lines.join('\n')
}

/**
 * Port of segment(text): split on blank lines into blocks, collapse whitespace, keep
 * blocks with >= 8 words; very long blocks (>= 1200 chars) are chopped into ~500-char
 * sentence-aligned chunks.
 */
export function segment(text: string): string[] {
  const paras: string[] = []
  // re.split(r"\n\s*\n", text)
  for (const block of text.split(/\n\s*\n/)) {
    const p = collapseWs(block)
    if (p.length < 1200) {
      if (wordCount(p) >= 8) paras.push(p)
    } else {
      // very long block: split into ~sentence chunks so paragraphs stay readable
      let buf = ''
      // re.split(r"(?<=[.!?])\s+", p)
      for (const sent of p.split(/(?<=[.!?])\s+/)) {
        buf = (buf + ' ' + sent).trim()
        if (buf.length >= 500) {
          paras.push(buf)
          buf = ''
        }
      }
      if (wordCount(buf) >= 8) paras.push(buf)
    }
  }
  return paras
}

import * as pdfjsLib from 'pdfjs-dist'
import type { TextItem } from 'pdfjs-dist/types/src/display/api'

// Bundle the worker as a same-origin asset (Vite resolves this URL at build time).
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

export interface PageText {
  page: number
  text: string
}

interface Line {
  text: string
  y: number
  h: number
}

function median(xs: number[]): number {
  const v = xs.filter((x) => x > 0).sort((a, b) => a - b)
  if (!v.length) return 0
  const mid = Math.floor(v.length / 2)
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2
}

/**
 * Reconstruct a page's text from pdf.js text items, approximating PyMuPDF's
 * get_text("text"): lines joined by "\n", and a blank line ("\n\n") inserted at
 * large vertical gaps or column resets so segment() can split on paragraph blocks.
 */
function reconstructPage(items: TextItem[]): string {
  const lines: Line[] = []
  let parts: string[] = []
  let lineY = NaN
  let lineH = 0

  for (const item of items) {
    if (typeof item.str !== 'string') continue
    const y = item.transform?.[5] ?? lineY
    const h = item.height || 0
    if (parts.length === 0) {
      lineY = y
      lineH = h
    }
    parts.push(item.str)
    if (h > lineH) lineH = h
    if (item.hasEOL) {
      lines.push({ text: parts.join(''), y: lineY, h: lineH })
      parts = []
      lineH = 0
    }
  }
  if (parts.length) lines.push({ text: parts.join(''), y: lineY, h: lineH })

  const medH = median(lines.map((l) => l.h)) || 10
  // PyMuPDF's get_text("text") joins lines on a page with single newlines and only
  // rarely emits a blank line (at genuine block boundaries). Matching that — joining
  // conservatively and inserting "\n\n" only at LARGE gaps / column resets — keeps the
  // in-browser corpus close to the Python paragraphs.csv (otherwise we over-segment ~4x).
  const GAP_FACTOR = 3.0
  let out = ''
  let prevY = NaN
  let prevH = 0
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i]
    if (i > 0) {
      const refH = Math.max(prevH || 0, ln.h || 0, medH) || medH
      const gap = prevY - ln.y // positive: moved down the page (PDF y grows upward)
      if (ln.y > prevY + 2.5 * refH) {
        out += '\n\n' // jumped well up the page — new column / section
      } else if (gap > GAP_FACTOR * refH) {
        out += '\n\n' // large vertical gap — genuine block break
      } else {
        out += '\n'
      }
    }
    out += ln.text
    prevY = ln.y
    prevH = ln.h
  }
  return out
}

/**
 * Extract text from a PDF entirely in the browser. Returns one entry per page.
 * The ArrayBuffer is consumed locally and never uploaded anywhere.
 */
export async function extractPdf(
  data: ArrayBuffer,
  onPage?: (page: number, total: number) => void,
): Promise<{ pages: PageText[]; numPages: number }> {
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(data),
    // keep it lean & offline; ESG reports are text PDFs
    isEvalSupported: false,
    disableFontFace: true,
  })
  const doc = await loadingTask.promise
  const pages: PageText[] = []
  try {
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p)
      const content = await page.getTextContent()
      const items = content.items.filter((it): it is TextItem => 'str' in it)
      pages.push({ page: p, text: reconstructPage(items) })
      page.cleanup()
      onPage?.(p, doc.numPages)
    }
  } finally {
    await doc.destroy()
  }
  return { pages, numPages: doc.numPages }
}

/** Parse company/year/report_type from the filename (mirrors parse_name in 1_extract_text.py). */
export function parseName(filename: string): {
  doc_id: string
  company: string
  year: string
  report_type: string
} {
  const base = filename.replace(/\.[^.]+$/, '')
  const parts = base.split('_')
  return {
    doc_id: base,
    company: parts[0] ?? base,
    year: parts.length > 1 ? parts[1] : '',
    report_type: parts.length > 2 ? parts[2] : '',
  }
}

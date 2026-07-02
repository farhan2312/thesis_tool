# ESGscope: fully in-browser ESG report analysis

**AI-Driven ESG Compliance Analysis for the MENA Oil & Gas Supply Chain.**

Drop a single ESG / sustainability PDF and get it analysed **entirely in your browser**.
No backend, no database, no upload; the file is parsed, classified, mined and scored in
the tab and then discarded. Built as a static React app for Vercel.

It reproduces the dissertation pipeline (MENA oil & gas ESG analysis) client-side:

```
PDF (pdf.js) -> paragraphs (segment) -> ESG topics (transformers.js + ONNX classifier)
   -> figures (regex) -> entities (ontology patterns) -> greenwashing score -> dashboard
```

The classifier (a fine-tuned DistilRoBERTa/ClimateBERT, **0.745 gold accuracy**) runs in
the browser via [`@huggingface/transformers`](https://github.com/huggingface/transformers.js)
on **WebGPU** when available, falling back to **WebAssembly**. The other four steps are
**exact JavaScript ports** of the Python pipeline, so they lose no accuracy; see
*Verification* below.

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173 (COOP/COEP headers set for cross-origin isolation)
npm run build    # type-check + production build into dist/
npm run preview  # serve the production build locally
```

Deploy: push to Vercel as a static site. `vercel.json` sets the COOP/COEP headers that
enable multithreaded WASM; the model and the ONNX runtime are served same-origin, so
`require-corp` never blocks them.

## How it works

| File | Role |
|------|------|
| `src/lib/pdf.ts` | pdf.js text extraction + line/block reconstruction (approx. PyMuPDF `get_text("text")`) |
| `src/lib/segment.ts` | paragraph segmentation, exact port of `1_extract_text.py` |
| `src/lib/classify.ts` | transformers.js classifier + label mapping (WebGPU then WASM fallback) |
| `src/lib/metrics.ts` | classifier-aware regex figure extraction, exact port of `2b_extract_metrics_refined.py` |
| `src/lib/ner.ts` | ontology pattern NER, port of `4_extract_entities.py` (spaCy EntityRuler as regex + `filter_spans`) |
| `src/lib/greenwashing.ts` | 0 to 100 greenwashing score, exact port of `5_greenwashing.py` |
| `src/lib/pipeline.ts` | orchestrates pdf, segment, classify, metrics, ner, score |
| `src/components/` | Dropzone, ModelLoader, Progress, ResultsDashboard + charts |
| `public/ontology.json` | copy of `mena_oilgas_esg_ontology.json`; drives units, NER terms, greenwashing lexicon |
| `public/models/esg-distilbert/` | int8 ONNX model + tokenizer + config (approx. 83 MB, cached after first load) |

### Labels (critical)

The classifier outputs 17 classes in the order `sorted(unique gold_topic_id)`:

```
0:E1 1:E2 2:E3 3:E4 4:E5 5:E6 6:G1 7:G2 8:G3 9:G4 10:OTHER 11:S1 12:S2 13:S3 14:S4 15:S5 16:X1
```

`config.json` `id2label` is patched to these real topic ids during export, and
`classify.ts` keeps the same array as a source of truth (and to recover from a stale
`LABEL_n` config). Each id maps to a topic name + pillar (E/S/G/Other) via the ontology.

## Re-exporting the model (one-off)

The browser model lives in `public/models/esg-distilbert/`. To regenerate it from the
saved fine-tune:

```bash
pip install onnx onnxruntime onnxscript          # plus a torch + transformers env
PYTHONUTF8=1 python scripts/export_model.py /path/to/pipeline_output/model_distilbert_supervised
```

This traces to ONNX (legacy exporter, opset 14, which decomposes LayerNorm for best
onnxruntime-web compatibility), patches the labels, copies the tokenizer, and
dynamic-int8 quantizes to `onnx/model_quantized.onnx` (approx. 83 MB). The int8 model was
verified to agree with the fp32 torch model on every test sentence.

## Verification

The four deterministic ports were diffed against the Python pipeline's own CSV outputs by
feeding the **exact** Python paragraphs/predictions into the JS code, across 5 reports
(ADNOC, Nakilat, Petrofac x2, TAQA):

- **Figure extraction: 1256 / 1256 rows byte-identical** (pattern, value, unit, topic,
  attribution method, page).
- **Greenwashing: every field exact** (score, claim-gap, vague density, specificity,
  assurance, discussed/substantiated, band).
- **NER: 100 % recall of the Python entities**, plus a few extra *true-positive* ISO
  certifications written as `ISO 27001:2013` that spaCy's tokenizer split and missed.

End-to-end in the browser: a real 40-page report runs on WebGPU and on the WASM fallback,
producing the correct topic distribution, figures, entities and a greenwashing score in the
same risk band as the Python (`High`, identical claim-gap).

### Known, deliberate deviations

- **PDF segmentation** approximates PyMuPDF (pdf.js exposes a different text model). Counts
  are close, not identical (e.g. 163 vs 135 paragraphs on the test report), which is the
  expected sanity-check level of agreement, not exact.
- **Greenwashing specificity** uses the *refined* metrics (the only extraction the browser
  runs), where the Python `5_greenwashing.py` read the original Stage-2 metrics. This makes
  the in-browser specificity signal slightly more generous; the band is unchanged.
- **NER** catches a handful of ISO certs spaCy missed (see above), so it is strictly more
  complete.

## Caveats (by design)

- Classifier accuracy is about 0.75 (this model) vs 0.88 for the GPU ensemble, the
  deliberate trade for a zero-infrastructure, fully private, in-browser tool. The headline
  accuracy in the thesis still refers to the full ensemble.
- The greenwashing score is a transparent disclosure-quality **triage indicator**, not a
  verdict on a company.
- First load downloads the int8 model once (approx. 83 MB) and caches it via the browser
  Cache API; subsequent loads are instant. Large reports take about 10 to 60 s in WASM
  (faster on WebGPU).

**Runs entirely in your browser. Your file never leaves your device.**

---

Mohammed Farhan · ENGG940 Master's Dissertation · University of Wollongong · Supervisor: Dr. Hazem Gouda

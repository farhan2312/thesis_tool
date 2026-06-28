# Build Brief: ESG Report Analysis Portal (fully in-browser)

A handoff spec for Claude Code. Build a web portal where a user drops a single ESG/sustainability PDF and gets it analysed entirely in the browser. No backend, no database, no GPU, and the file never leaves the device.

## 1. Goal and constraints

- One screen: drag-and-drop a PDF, see results.
- **Everything runs client-side in the browser.** No server, no API, no storage. The PDF is parsed, analysed and discarded in the tab.
- **Frontend:** React, deployed on **Vercel** as a pure static site.
- **Classifier:** a fine-tuned transformer running in-browser via **transformers.js** (ONNX, WASM or WebGPU). Use **DistilBERT** (recommended: already trained and saved, ~0.75 gold accuracy) or **ClimateBERT** (optional domain variant, needs a re-save first). This trades accuracy versus the 0.88 GPU ensemble, by design.
- The other steps (paragraph segmentation, regex figure extraction, pattern NER, greenwashing score) are **deterministic JavaScript ports** of the existing Python, so they are identical in behaviour and lose no accuracy.

## 2. Architecture (all client-side)

In the browser: pdf.js extracts text, JS segments paragraphs, transformers.js classifies each paragraph by ESG topic, JS regex extracts figures, JS matches ontology patterns for entities, JS computes the greenwashing score, and React renders the dashboard. The model, tokenizer and ontology are static assets cached after first load. Nothing is uploaded anywhere.

```
Browser tab (React on Vercel, static)
  PDF (pdf.js)  ->  paragraphs (segment.ts)  ->  topics (transformers.js + ONNX DistilBERT)
       -> figures (regex)  -> entities (ontology patterns)  -> greenwashing score  -> dashboard
  (model + tokenizer + ontology.json served as static files; file never leaves the device)
```

## 3. Repo layout (single frontend app)

```
esg-portal/
  public/
    models/esg-distilbert/   # ONNX model + tokenizer + config (or load from a public HF Hub repo)
    ontology.json            # copy of mena_oilgas_esg_ontology.json
  src/
    lib/pdf.ts               # pdf.js text extraction
    lib/segment.ts           # paragraph segmentation (port of 1_extract_text.py)
    lib/classify.ts          # transformers.js classifier + label mapping
    lib/metrics.ts           # regex figure extraction (port of 2b_extract_metrics_refined.py)
    lib/ner.ts               # ontology pattern NER (port of 4_extract_entities.py)
    lib/greenwashing.ts      # 0-100 score (port of 5_greenwashing.py)
    lib/pipeline.ts          # orchestrates pdf -> segment -> classify -> metrics -> ner -> score
    components/              # Dropzone, ModelLoader, Progress, ResultsDashboard, charts
    App.tsx
  vercel.json                # COOP/COEP headers (see section 9)
  package.json
```

## 4. Model conversion (one-off, do this first)

- **Source model:** the saved fine-tuned `pipeline_output/model_distilbert_supervised/` (DistilBERT, ~0.75). For the ClimateBERT variant, first re-run `7b_train_supervised.py --model climatebert/distilroberta-base-climate-f` and `save_pretrained`, then export that folder instead.
- **Export to ONNX and quantize with Optimum:**
  - `pip install "optimum[exporters]" onnx onnxruntime`
  - `optimum-cli export onnx --model pipeline_output/model_distilbert_supervised --task text-classification frontend/public/models/esg-distilbert`
  - Quantize to int8 (Optimum `ORTQuantizer` or onnxruntime) to bring the download to roughly 30-65 MB.
- The export folder must contain `config.json`, the tokenizer files (`tokenizer.json`, `tokenizer_config.json`, vocab/merges), and `onnx/model_quantized.onnx`.
- **Labels (critical):** make sure `config.json` `id2label` maps each output index to the real topic. The training used `labels = sorted(unique gold_topic_id)`, so index order is that sorted list (E1, E2, ... OTHER). Either fix `id2label` in `config.json` after export, or keep that exact label array in `classify.ts` and map index -> topic_id -> {topic name, pillar} via the ontology.
- **Hosting:** bundle the folder under `public/models/` (self-contained, served by Vercel) or push it to a public Hugging Face Hub repo and load it by id.

## 5. In-browser classification (transformers.js)

- Use **`@huggingface/transformers`** (the maintained transformers.js).
- Load the model once at app start: set `env.allowLocalModels = true` and `env.localModelPath = '/models/'`, then `pipeline('text-classification', 'esg-distilbert', { quantized: true })`. Use WebGPU when available, else WASM.
- Classify paragraphs in batches; take the argmax label and its softmax probability as the confidence; map label -> topic_id, topic name, pillar (E/S/G/Other).
- Show progress (paragraph i of N). transformers.js caches the model via the browser Cache API, so subsequent loads are instant.

## 6. Porting the deterministic steps (exact, no accuracy loss)

- **segment.ts** (port of `1_extract_text.py`): strip repeating headers/footers and page numbers, join wrapped lines, split into paragraph units with a minimum-length threshold.
- **metrics.ts** (port of `2b_extract_metrics_refined.py`): the four regex families (emissions and energy, water/waste/workforce, safety, localisation ICV/IKTVA); attribute each extracted figure to the predicted topic of its paragraph.
- **ner.ts** (port of `4_extract_entities.py`): the spaCy EntityRuler rules are dictionary/pattern based, so reimplement as case-insensitive matching over the ontology term lists, emitting labels (FRAMEWORK, CERTIFICATION, TARGET, etc.).
- **greenwashing.ts** (port of `5_greenwashing.py`): claim-vs-evidence gap (0.45), vague-language density (0.25), specificity deficit (0.20), assurance deficit (0.10), with the same caps and the Low/Moderate/High bands.
- `ontology.json` drives the metrics units, the NER term lists and the greenwashing lexicon; ship it in `public/`.

## 7. Results dashboard (the four chosen outputs)

1. **Topic classification** — pillar split (donut or stacked bar) + topic distribution (horizontal bar), and an optional collapsible per-paragraph table (page, topic, confidence, text) with a confidence filter.
2. **Greenwashing score** — a large score number + Low/Moderate/High band chip, a small bar of the four component signals, and the discussed-vs-substantiated counts. State that it is a transparent triage indicator, not a verdict.
3. **Extracted figures** — bar of counts by metric family + a searchable table (family, topic, value, unit, page, snippet).
4. **Named entities** — counts by type + a grouped list (frameworks, certifications, targets).

- Footer note: **"Runs entirely in your browser. Your file never leaves your device."**
- **Palette (reuse from the deck):** green `#1f9d57`, blue `#1565c0`, purple `#6a39b8`, teal `#00897b`, amber `#e2860c`, red `#d8483a`; pillar colours E/S/G/Other = green/blue/purple/grey; clean light theme, white cards, dark text.

## 8. Dependencies

`react`, `react-dom`, `vite`, `typescript`, `@huggingface/transformers`, `pdfjs-dist`, `recharts`, `react-dropzone`.

## 9. Performance and deployment notes

- **First load** downloads the quantized model once (tens of MB) and caches it; show a one-time "loading model" state.
- **Speed:** WASM is fine for DistilBERT; enable WebGPU when the browser supports it. For multithreaded WASM, the page must be cross-origin isolated, so add a `vercel.json` with COOP/COEP headers:
  ```json
  { "headers": [ { "source": "/(.*)", "headers": [
      {"key":"Cross-Origin-Opener-Policy","value":"same-origin"},
      {"key":"Cross-Origin-Embedder-Policy","value":"require-corp"} ] } ] }
  ```
  (Single-threaded still works without these, just slower. Since the model is local, COEP require-corp will not block it.)
- **Large reports** (hundreds of paragraphs) may take roughly 10-60 s in WASM; batch and show a progress bar, and consider a max-paragraph cap or chunking with a "show more" control.
- Fully stateless: nothing is written anywhere.

## 10. Build order (suggested for Claude Code)

1. Convert and quantize the DistilBERT model to ONNX; load it in a tiny transformers.js test and confirm it classifies a sample ESG sentence to the correct topic label.
2. `pdf.ts` + `segment.ts`: produce clean paragraphs from a sample PDF; sanity-check against the Python `paragraphs.csv` output.
3. `classify.ts`: classify the paragraphs; confirm the topic distribution looks sane.
4. `metrics.ts`, `ner.ts`, `greenwashing.ts`: port and spot-check each against the Python output for one report (these should match closely).
5. `pipeline.ts` + dashboard; then deploy to Vercel.

## 11. Caveats (state upfront)

- Classifier accuracy is about 0.75 (DistilBERT) versus 0.88 for the GPU ensemble, the deliberate trade for a zero-infrastructure, fully private, in-browser tool.
- The figure extraction, NER and greenwashing steps are deterministic ports, so only the classifier differs from the dissertation pipeline.
- This is a live demonstration tool; the headline accuracy reported in the thesis still refers to the full ensemble.

## 12. Acceptance criteria

- Dropping a real MENA O&G sustainability PDF returns, within the browser and without any network upload of the file, the topic distribution, a greenwashing score and band, extracted figures by family, and entities, rendered as charts and tables.
- No backend, no database, no file leaves the device.
- Deploys as a static site on Vercel.

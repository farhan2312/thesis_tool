#!/usr/bin/env python3
"""
One-off model export for the in-browser ESG portal.

Exports the fine-tuned ESG classifier to ONNX, patches the label map to the real ESG
topic ids, copies the tokenizer, and quantizes to int8 for @huggingface/transformers
(transformers.js v3). Output lands in  public/models/esg-distilbert/.

The saved model `pipeline_output/model_distilbert_supervised/` is — despite the folder
name — a ClimateBERT / DistilRoBERTa fine-tune (RobertaForSequenceClassification),
0.745 gold accuracy. It is the recommended "~0.75" model from the build brief.

Run from anywhere with a Python env that has torch + transformers (no torchvision needed):
    pip install onnx onnxruntime onnxscript
    python scripts/export_model.py /path/to/pipeline_output/model_distilbert_supervised

Notes
  * Uses the legacy TorchScript ONNX exporter (dynamo=False): self-contained file and
    decomposes LayerNorm for opset < 17 (best onnxruntime-web compatibility).
  * Run with PYTHONUTF8=1 on Windows so the exporter's status emoji doesn't crash stdout.
"""
import os, sys, json, glob
import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

SRC = sys.argv[1] if len(sys.argv) > 1 else "pipeline_output/model_distilbert_supervised"
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # the app root
OUT = os.path.join(HERE, "public", "models", "esg-distilbert")
ONNX_DIR = os.path.join(OUT, "onnx")
os.makedirs(ONNX_DIR, exist_ok=True)

# Exact label order used at training time: sorted(unique gold_topic_id).
LABELS = ["E1","E2","E3","E4","E5","E6","G1","G2","G3","G4","OTHER","S1","S2","S3","S4","S5","X1"]

print(">> Loading model + tokenizer from", SRC)
tok = AutoTokenizer.from_pretrained(SRC)
model = AutoModelForSequenceClassification.from_pretrained(SRC, torch_dtype=torch.float32).eval()
assert model.config.num_labels == len(LABELS), (model.config.num_labels, len(LABELS))
model.config.id2label = {i: l for i, l in enumerate(LABELS)}
model.config.label2id = {l: i for i, l in enumerate(LABELS)}

print(">> Tracing -> ONNX (fp32, legacy exporter)")
enc = tok("Scope 1 and Scope 2 greenhouse gas emissions were 1,200 tCO2e in 2023.",
          return_tensors="pt", truncation=True, max_length=256)
fp32 = os.path.join(ONNX_DIR, "model.onnx")
with torch.no_grad():
    torch.onnx.export(
        model, (enc["input_ids"], enc["attention_mask"]), fp32,
        input_names=["input_ids", "attention_mask"], output_names=["logits"],
        dynamic_axes={"input_ids": {0: "batch", 1: "sequence"},
                      "attention_mask": {0: "batch", 1: "sequence"},
                      "logits": {0: "batch"}},
        opset_version=14, do_constant_folding=True, export_params=True, dynamo=False,
    )

print(">> Writing patched config.json + tokenizer")
model.config.to_json_file(os.path.join(OUT, "config.json"))
tok.save_pretrained(OUT)

print(">> Quantizing to int8 (dynamic)")
from onnxruntime.quantization import quantize_dynamic, QuantType
q8 = os.path.join(ONNX_DIR, "model_quantized.onnx")
pre = fp32
try:
    from onnxruntime.quantization.shape_inference import quant_pre_process
    pre = os.path.join(ONNX_DIR, "model_pre.onnx")
    quant_pre_process(fp32, pre, skip_symbolic_shape=False)
except Exception as e:
    print("   (skip preprocess:", str(e)[:80], ")"); pre = fp32
quantize_dynamic(model_input=pre, model_output=q8, weight_type=QuantType.QInt8,
                 per_channel=False, reduce_range=False)

print(">> Trimming fp32 artifacts (ship only the int8 model)")
for p in [fp32, *glob.glob(os.path.join(ONNX_DIR, "model_pre*")),
          *glob.glob(os.path.join(ONNX_DIR, "*.onnx_data"))]:
    if os.path.exists(p):
        os.remove(p)

print(">> Done. Final files:")
for root, _, files in os.walk(OUT):
    for f in sorted(files):
        p = os.path.join(root, f)
        print(f"   {os.path.relpath(p, OUT):42s} {os.path.getsize(p)/1e6:7.2f} MB")
print("\nLabels:", json.dumps({str(i): l for i, l in enumerate(LABELS)}))

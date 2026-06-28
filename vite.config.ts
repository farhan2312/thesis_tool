import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'

// Cross-origin-isolation headers. They enable multithreaded WASM (SharedArrayBuffer)
// and are required to match the production Vercel headers (see vercel.json). Because
// the model and the ONNX runtime WASM are both served same-origin, require-corp does
// not block them — same-origin resources are always allowed under COEP.
const crossOriginIsolation = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Self-host the onnxruntime-web WASM binaries under /ort/ so the runtime loads
    // same-origin (COEP-safe) and the site is fully self-contained — no CDN at runtime.
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/onnxruntime-web/dist/*.wasm',
          dest: 'ort',
        },
        {
          src: 'node_modules/onnxruntime-web/dist/*.mjs',
          dest: 'ort',
        },
      ],
    }),
  ],
  server: { headers: crossOriginIsolation },
  preview: { headers: crossOriginIsolation },
  // onnxruntime-web ships prebuilt assets that Vite's dep optimizer mishandles.
  optimizeDeps: { exclude: ['onnxruntime-web', '@huggingface/transformers'] },
  build: { target: 'esnext' },
  worker: { format: 'es' },
})

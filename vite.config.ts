import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Resource-Policy': 'cross-origin',
    },
    // Configure MIME types for model files
    middlewareMode: false,
    // Proxy CDN requests to avoid CORS issues
    proxy: {
      '/api/cdn': {
        target: 'https://ai-models.b-cdn.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/cdn/, ''),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Remove problematic headers
            proxyReq.removeHeader('origin');
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            // Add CORS headers to the response
            proxyRes.headers['access-control-allow-origin'] = '*';
            proxyRes.headers['access-control-allow-methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
            proxyRes.headers['access-control-allow-headers'] = 'Content-Type, Authorization';
          });
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    exclude: ['@huggingface/transformers'],
  },
  define: {
    global: 'globalThis',
    'process.env.HF_HOST': '"https://ai-models.b-cdn.net"',
    'process.env.HF_HUB_URL': '"https://ai-models.b-cdn.net"',
    'process.env.HUGGINGFACE_HUB_URL': '"https://ai-models.b-cdn.net"',
    'globalThis.HF_HOST': '"https://ai-models.b-cdn.net"',
    'globalThis.HF_HUB_URL': '"https://ai-models.b-cdn.net"',
    'globalThis.HUGGINGFACE_HUB_URL': '"https://ai-models.b-cdn.net"',
  },
  worker: {
    format: 'es'
  },
  // Configure asset handling for model files and WASM
  assetsInclude: ['**/*.onnx', '**/*.wasm'],
  publicDir: 'public',
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setupTests.ts',
    css: true,
  },
})



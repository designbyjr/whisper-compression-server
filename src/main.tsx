import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

// Configure environment for Transformers.js CDN
// JSON files at base, ONNX files under /onnx
if (typeof globalThis !== 'undefined') {
  globalThis.HF_HOST = 'https://ai-models.b-cdn.net';
  globalThis.HF_HUB_URL = 'https://ai-models.b-cdn.net';
  globalThis.HUGGINGFACE_HUB_URL = 'https://ai-models.b-cdn.net';
}
if (typeof window !== 'undefined') {
  (window as any).HF_HOST = 'https://ai-models.b-cdn.net';
  (window as any).HF_HUB_URL = 'https://ai-models.b-cdn.net';
  (window as any).HUGGINGFACE_HUB_URL = 'https://ai-models.b-cdn.net';
}

console.log('Main: CDN host configured for Transformers.js');

createRoot(document.getElementById('root')!).render(<App />)




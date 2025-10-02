# Whisper Model Compression & Local Server

An optimized Whisper speech-to-text implementation with advanced model compression, local serving, and persistent browser caching.

## 🚀 Features

- **Multi-Compression Support**: LZMA and ZSTD compression for optimal model sizes
- **4-bit Quantized Models**: Maintains 95% quality with massive size reduction
- **Local Model Server**: Serves compressed models with automatic decompression
- **Browser Persistence**: Models persist across browser sessions using IndexedDB
- **12MB Chunking**: Optimal chunk size for HTTP/2 parallel downloads
- **Model Switching**: Easy switching between Whisper Tiny, Small, and Base models

## 📊 Model Compression Results

| Model | Original | 4-bit + LZMA | Savings | Quality |
|-------|----------|--------------|---------|---------|
| **Whisper Small** | ~558MB | **171MB** | **69% saved** | 95% quality |
| **Whisper Base** | ~550MB | **102MB** | **81% saved** | 98% quality |
| **Whisper Tiny** | ~117MB | **69MB** | **41% saved** | 90% quality |

## 🏗️ Architecture

### Compression Pipeline
1. **Download** → 4-bit quantized ONNX models from Hugging Face
2. **Compress** → LZMA level 9 compression for maximum efficiency  
3. **Chunk** → Split into 12MB pieces for optimal HTTP/2 transfer
4. **Serve** → Local server automatically decompresses and serves files
5. **Cache** → Browser persistent storage via IndexedDB

### Model Server v2.1
- **Multi-format support**: Serves LZMA, ZSTD, and regular files
- **Smart routing**: Automatically chooses best compression format
- **CORS enabled**: Works with local development
- **Health monitoring**: `/health` endpoint with model status

## 🛠️ Setup & Installation

### Prerequisites
- Node.js 16+
- npm or yarn
- `zstd` and `xz` compression tools

```bash
# macOS
brew install zstd xz

# Linux
sudo apt-get install zstd xz-utils
```

### Installation

```bash
# Clone repository
git clone https://github.com/designbyjr/whisper-compression-server.git
cd whisper-compression-server

# Install dependencies
npm install

# Download models (choose one)
./download-whisper-small-lzma.sh    # 171MB, best quality/size balance
./download-whisper-base-zstd.sh     # 102MB, highest quality
```

### Running

The frontend now loads Whisper model files from the CDN at
[`https://ai-models.b-cdn.net`](https://ai-models.b-cdn.net) by default, so you can run the
app without the local model server:

```bash
npm run dev
```

If you need to serve the assets yourself (for offline testing or custom models), start the
model server and point the frontend at it with environment variables:

```bash
node model-server.js
VITE_WHISPER_MODEL_URL=http://localhost:3001/onnx-community/whisper-small npm run dev
```

You can also override `VITE_WHISPER_CHUNK_SERVER_URL` and set `VITE_WHISPER_CHUNKED=true`
to re-enable the experimental chunked downloader against a compatible server.

## 🔧 Model Management

### Switch Models
```bash
npm run switch small    # Whisper Small (171MB LZMA)
npm run switch base     # Whisper Base (102MB ZSTD)  
npm run switch tiny     # Whisper Tiny (69MB ZSTD)
npm run switch          # Show current model & options
```

### Download Scripts
- `download-whisper-small-lzma.sh` - Downloads 4-bit Small with LZMA compression
- `download-whisper-base-zstd.sh` - Downloads 4-bit Base with ZSTD compression
- `download-models.sh` - Downloads original Tiny model (legacy)

### Cache Management
Models persist in browser IndexedDB automatically. To clear:
- Switch models: `npm run switch <model>` (clears old model)
- Manual clear: Browser DevTools → Application → IndexedDB → Delete

## 🎯 Usage

### Basic Transcription
```typescript
import { useWhisper } from './hooks/useWhisper';

const { transcribe, isTranscribing, error, modelReady } = useWhisper();

// Wait for model to load
if (modelReady) {
  const result = await transcribe(audioBlob);
  console.log(result.text);
}
```

### Model Server Health Check
```bash
curl http://localhost:3001/health
```

## 🔬 Technical Details

### Compression Methods Tested
- **Individual file compression**: Each model file compressed separately
- **Folder compression**: Entire model archived then compressed (tested)
- **Result**: Individual compression achieved better ratios for ONNX models

### Chunk Size Analysis
Tested chunk sizes: 12MB, 32MB, 64MB, 128MB, whole file
- **12MB achieved best compression** (28.3% vs 27.9% for larger chunks)
- **Network benefits**: 6 parallel streams, better error recovery, progressive loading

### Browser Persistence Strategy
- **Memory cache**: Instant access for active session
- **IndexedDB**: Survives browser restarts and tab closes
- **Version management**: Automatic cleanup of old model versions
- **Cache-first**: Always check cache before downloading

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📜 License

MIT License

## 🙏 Acknowledgments

- [Hugging Face Transformers.js](https://github.com/xenova/transformers.js)
- [OpenAI Whisper](https://github.com/openai/whisper)
- [LZMA-JS](https://github.com/nmrugg/LZMA-JS)
- [ZSTD](https://github.com/facebook/zstd)
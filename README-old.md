# Whisper Web Speech-to-Text

A real-time speech-to-text application using OpenAI's Whisper model running locally in the browser with WebGPU acceleration.

## Features

- 🎤 **Real-time recording** with visual waveform feedback
- 🧠 **Local AI processing** - Whisper model runs entirely in your browser
- ⚡ **WebGPU acceleration** for faster transcription
- 🔒 **Privacy-first** - no data sent to external servers
- 📱 **Responsive design** works on desktop and mobile
- 📊 **Progress tracking** with download percentage and file details

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Download Whisper Model

**Option A: Whisper Small (Recommended - Better Accuracy)**
```bash
./download-whisper-small.sh
```
Downloads ~200MB to `public/models-small/`. Better transcription accuracy.

**Option B: Whisper Tiny (Faster)**
```bash
./download-models.sh
```
Downloads ~131MB to `public/models/`. Faster but less accurate.

**Model Comparison:**
- **Small**: ~244M parameters, ~200MB, better accuracy, slightly slower
- **Tiny**: ~40M parameters, ~131MB, faster, lower accuracy

Both download:
- Configuration files (JSON)
- Tokenizer and vocabulary
- ONNX model files (encoder and decoder)

### 3. Run Development Server

**Option 1: Smart Start (Recommended)**
```bash
npm start
```
This checks for model files and starts both the local model server (port 3001) and the Vite dev server (port 5173).

**Option 2: Manual Dev**
```bash
npm run dev
```
Starts both servers simultaneously using concurrently.

### 4. Model Switching (Optional)

**Switch Between Models:**
```bash
# Switch to Whisper Small (better accuracy)
npm run switch small

# Switch to Whisper Tiny (faster)
npm run switch tiny

# Show current model and help
npm run switch
```

**Quick Download:**
```bash
# Download Whisper Small
npm run download-small

# Download Whisper Tiny  
npm run download-tiny
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Browser Compatibility

- **Chrome/Edge 140+** (WebGPU support)
- **Firefox 120+** (WebAssembly fallback)
- **Safari 17+** (WebAssembly fallback)

**Note:** Chrome provides the best performance with WebGPU acceleration.

## How It Works

1. **Model Preloading**: Whisper model loads automatically when you open the app
2. **Audio Recording**: Uses MediaRecorder API to capture audio in WebM format
3. **Audio Processing**: Converts to 16kHz mono PCM data that Whisper expects
4. **Local Transcription**: Whisper model runs in a Web Worker with WebGPU acceleration
5. **Real-time Results**: Transcribed text appears as you speak

## Model Comparison

| Model | Parameters | Size | Speed | Accuracy | Use Case |
|-------|------------|------|-------|----------|----------|
| **Whisper Tiny** | 40M | ~131MB | Faster | Good | Quick transcription, testing |
| **Whisper Small** | 244M | ~200MB | Slower | Better | Production, high accuracy needed |

**Recommendations:**
- **Development/Testing**: Use Tiny for faster iteration
- **Production**: Use Small for better user experience
- **Mobile/Low-end**: Use Tiny for performance
- **Desktop/High-end**: Use Small for accuracy

## Project Structure

```
src/
├── components/
│   ├── SpeechToText.tsx      # Main recording interface
│   ├── ModelProgress.tsx     # Download progress display
│   └── AnimatedWaveform.tsx  # Visual audio feedback
├── hooks/
│   ├── useWhisper.ts         # Whisper model integration
│   ├── useSpeechRecording.ts # Audio recording logic
│   └── useWorker.ts          # Web Worker management
└── worker.js                 # Whisper processing worker

public/
└── models/                   # Local Whisper model files
    ├── config.json
    ├── tokenizer.json
    └── onnx/
        ├── encoder_model.onnx
        └── decoder_model_merged_q4.onnx
```

## Performance

- **Model Loading**: ~0.5-2 seconds (from local server) / ~2-5 seconds (online fallback)
- **Transcription**: ~1-3 seconds for 10-second audio clips
- **Memory Usage**: ~200-400MB (model loaded in browser)
- **Network**: Models served from localhost:3001 (no internet required after download)

## Technical Details

- **Framework**: React + TypeScript + Vite
- **AI Model**: OpenAI Whisper Small (244M parameters) for better accuracy
- **Acceleration**: WebGPU (Chrome) / WebAssembly (other browsers)
- **Audio Processing**: 16kHz mono PCM, automatic resampling
- **Cross-Origin Isolation**: Enabled for SharedArrayBuffer support

## Troubleshooting

### Model Not Loading
- **For Small model**: `./download-whisper-small.sh`
- **For Tiny model**: `./download-models.sh`
- Check browser console for download errors
- Verify dev server is running on port 5173

### Poor Audio Quality
- Use Chrome for best WebGPU performance
- Ensure microphone permissions are granted
- Try recording in a quiet environment

### Transcription Errors
- Speak clearly and at normal pace
- Check if audio is being recorded (waveform animation)
- Verify model files are complete:
  - Small model: ~200MB total in `public/models-small/`
  - Tiny model: ~131MB total in `public/models/`

## License

MIT License - see LICENSE file for details.
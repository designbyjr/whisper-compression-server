import { useCallback, useEffect, useRef, useState } from "react";
import { useWorker } from "./useWorker";
import { TranscriberData } from "./useWhisper";
import { 
  ChunkDownloadManager, 
  OverallProgress,
  formatBytes,
  formatTime 
} from "../utils/chunkDownloader";

// Enhanced model configuration with chunked download support
const ENHANCED_MODEL_CONFIG = {
  chunkedDownloadEnabled: true,
  serverUrl: 'http://localhost:3001',
  fallbackToOriginal: true,
  compressionEnabled: true,
  models: {
    tiny: 'onnx-community/whisper-tiny',
    small: 'onnx-community/whisper-small'
  }
};

// Enhanced progress interface that combines original and chunked progress
export interface EnhancedProgress {
  // Original progress fields
  isModelLoading: boolean;
  modelReady: boolean;
  progressItems: any[];
  
  // Enhanced chunked download fields
  chunkedDownloadActive: boolean;
  chunkedProgress?: OverallProgress;
  downloadMethod: 'original' | 'chunked' | 'fallback';
  compressionStats?: {
    originalSize: number;
    compressedSize: number;
    savings: string;
  };
}

interface UseWhisperEnhancedReturn {
  transcribe: (audioBlob: Blob) => Promise<TranscriberData | null>;
  isTranscribing: boolean;
  error: string | null;
  progress: EnhancedProgress;
  resetState: () => void;
  cancelDownload: () => void;
}

/**
 * Enhanced useWhisper hook with chunked download support
 */
export const useWhisperEnhanced = (): UseWhisperEnhancedReturn => {
  const [transcript, setTranscript] = useState<TranscriberData | undefined>(undefined);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<EnhancedProgress>({
    isModelLoading: true,
    modelReady: false,
    progressItems: [],
    chunkedDownloadActive: false,
    downloadMethod: 'original'
  });

  // Web worker for Transformers.js
  const webWorker = useWorker((event) => {
    const message = event.data;
    console.log('Enhanced Whisper received worker message:', message);
    
    handleWorkerMessage(message);
  });

  // Chunk download manager
  const chunkDownloadManagerRef = useRef<ChunkDownloadManager | null>(null);
  const currentResolveRef = useRef<((value: TranscriberData | null) => void) | null>(null);
  const hasPreloaded = useRef(false);
  const modelUrlsRef = useRef<Map<string, string>>(new Map());

  /**
   * Handle worker messages (similar to original useWhisper)
   */
  const handleWorkerMessage = useCallback((message: any) => {
    switch (message.status) {
      case "progress":
        // Handle original progress updates
        setProgress(prev => ({
          ...prev,
          progressItems: prev.progressItems.map(item => 
            item.file === message.file ? { ...item, ...message } : item
          )
        }));
        break;

      case "update":
      case "complete":
        const busy = message.status === "update";
        setTranscript({
          isBusy: busy,
          text: message.data.text,
          tps: message.data.tps,
          chunks: message.data.chunks,
        });
        setIsBusy(busy);
        break;

      case "initiate":
        console.log('Model loading initiated:', message.name);
        setProgress(prev => ({
          ...prev,
          isModelLoading: true,
          progressItems: [...prev.progressItems, { ...message, startTime: Date.now() }]
        }));
        break;

      case "ready":
      case "model_ready":
        console.log('Model ready for transcription');
        setProgress(prev => ({
          ...prev,
          modelReady: true,
          isModelLoading: false,
          progressItems: [],
          chunkedDownloadActive: false
        }));
        break;

      case "error":
        setIsBusy(false);
        setProgress(prev => ({
          ...prev,
          isModelLoading: false,
          chunkedDownloadActive: false
        }));
        setError(`Model error: "${message.data.message}"`);
        break;

      case "done":
        setProgress(prev => ({
          ...prev,
          progressItems: prev.progressItems.filter(item => item.file !== message.file)
        }));
        break;
    }
  }, []);

  /**
   * Handle chunked download progress updates
   */
  const handleChunkedProgress = useCallback((chunkedProgress: OverallProgress) => {
    console.log('Chunked download progress:', chunkedProgress);
    
    setProgress(prev => ({
      ...prev,
      chunkedProgress,
      chunkedDownloadActive: chunkedProgress.status !== 'completed' && chunkedProgress.status !== 'failed',
      isModelLoading: chunkedProgress.status !== 'completed',
      downloadMethod: chunkedProgress.status === 'fallback' ? 'fallback' : 'chunked'
    }));

    // Update compression stats if available
    if (chunkedProgress.compressionRatio && chunkedProgress.totalBytes > 0) {
      const originalSize = Math.round(chunkedProgress.totalBytes / (1 - parseFloat(chunkedProgress.compressionRatio) / 100));
      setProgress(prev => ({
        ...prev,
        compressionStats: {
          originalSize,
          compressedSize: chunkedProgress.totalBytes,
          savings: chunkedProgress.compressionRatio + '%'
        }
      }));
    }

    // Handle completion
    if (chunkedProgress.status === 'completed') {
      console.log('✅ Chunked download completed successfully');
      setProgress(prev => ({
        ...prev,
        modelReady: true,
        isModelLoading: false,
        chunkedDownloadActive: false
      }));
    }

    // Handle failure - will trigger fallback
    if (chunkedProgress.status === 'failed') {
      console.warn('❌ Chunked download failed, falling back to original method');
      initiateOriginalDownload();
    }
  }, []);

  /**
   * Attempt chunked model download
   */
  const attemptChunkedDownload = useCallback(async (modelName: string): Promise<boolean> => {
    if (!ENHANCED_MODEL_CONFIG.chunkedDownloadEnabled) {
      return false;
    }

    try {
      console.log('🚀 Attempting chunked download for model:', modelName);
      
      // Create chunk download manager
      chunkDownloadManagerRef.current = new ChunkDownloadManager(
        ENHANCED_MODEL_CONFIG.serverUrl,
        handleChunkedProgress
      );

      setProgress(prev => ({
        ...prev,
        chunkedDownloadActive: true,
        downloadMethod: 'chunked',
        isModelLoading: true
      }));

      // Download model using chunked approach
      const modelUrls = await chunkDownloadManagerRef.current.downloadModel(modelName);
      
      // Store URLs for worker to use
      modelUrlsRef.current = modelUrls;
      
      console.log('✅ Chunked download successful, URLs available for worker');
      return true;

    } catch (error) {
      console.error('❌ Chunked download failed:', error);
      setError(`Chunked download failed: ${error}. Falling back to original method.`);
      return false;
    }
  }, [handleChunkedProgress]);

  /**
   * Fall back to original download method
   */
  const initiateOriginalDownload = useCallback(() => {
    console.log('🔄 Initiating original download method');
    
    setProgress(prev => ({
      ...prev,
      downloadMethod: 'fallback',
      chunkedDownloadActive: false,
      isModelLoading: true
    }));

    // Use original worker-based download
    const modelName = 'tiny'; // Default to tiny for fallback
    const modelId = ENHANCED_MODEL_CONFIG.models[modelName];
    
    webWorker.postMessage({
      type: 'preload',
      model: modelId
    });
  }, [webWorker]);

  /**
   * Preload model with enhanced chunked download
   */
  const preloadModel = useCallback(async () => {
    if (hasPreloaded.current) return;
    hasPreloaded.current = true;

    console.log('🚀 Starting enhanced model preload...');
    
    // First, try chunked download
    const modelName = 'tiny'; // Start with tiny model
    const chunkedSuccess = await attemptChunkedDownload(modelName);
    
    if (!chunkedSuccess && ENHANCED_MODEL_CONFIG.fallbackToOriginal) {
      // Fall back to original method
      initiateOriginalDownload();
    } else if (!chunkedSuccess) {
      setError('Model download failed and fallback is disabled');
    }
  }, [attemptChunkedDownload, initiateOriginalDownload]);

  /**
   * Initialize on component mount
   */
  useEffect(() => {
    preloadModel();
  }, [preloadModel]);

  /**
   * Watch for transcript updates to resolve promises
   */
  useEffect(() => {
    if (transcript && !transcript.isBusy && currentResolveRef.current) {
      const resolve = currentResolveRef.current;
      currentResolveRef.current = null;
      setIsBusy(false);
      resolve(transcript);
    }
  }, [transcript]);

  /**
   * Enhanced transcribe function
   */
  const transcribe = useCallback(async (audioBlob: Blob): Promise<TranscriberData | null> => {
    try {
      if (!progress.modelReady) {
        throw new Error('Model is not ready yet. Please wait for the model to load.');
      }
      
      setError(null);
      setTranscript(undefined);
      setIsBusy(true);

      console.log('🎙️ Starting enhanced transcription...');
      
      // Convert blob to array buffer and process (same as original)
      const arrayBuffer = await audioBlob.arrayBuffer();
      console.log('Audio blob size:', arrayBuffer.byteLength, 'bytes');
      
      if (arrayBuffer.byteLength === 0) {
        throw new Error('Audio blob is empty');
      }
      
      // Audio processing (same as original useWhisper)
      const audioContext = new AudioContext();
      let audioBuffer;
      
      try {
        audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      } catch (decodeError) {
        console.error('Failed to decode audio data:', decodeError);
        throw new Error('Failed to decode audio. The recording format may not be supported.');
      }
      
      console.log(`Original audio: ${audioBuffer.duration.toFixed(2)}s, ${audioBuffer.sampleRate}Hz, ${audioBuffer.numberOfChannels} channels`);
      
      // Whisper requires 16kHz sample rate
      const targetSampleRate = 16000;
      let processedAudio: Float32Array;
      
      // Get mono audio data (convert stereo to mono if needed)
      let monoAudio: Float32Array;
      if (audioBuffer.numberOfChannels === 2) {
        const SCALING_FACTOR = Math.sqrt(2);
        const left = audioBuffer.getChannelData(0);
        const right = audioBuffer.getChannelData(1);
        monoAudio = new Float32Array(left.length);
        for (let i = 0; i < audioBuffer.length; ++i) {
          monoAudio[i] = (SCALING_FACTOR * (left[i] + right[i])) / 2;
        }
      } else {
        monoAudio = audioBuffer.getChannelData(0);
      }
      
      // Resample to 16kHz if necessary
      if (audioBuffer.sampleRate !== targetSampleRate) {
        console.log(`Resampling from ${audioBuffer.sampleRate}Hz to ${targetSampleRate}Hz`);
        
        const ratio = audioBuffer.sampleRate / targetSampleRate;
        const newLength = Math.round(monoAudio.length / ratio);
        processedAudio = new Float32Array(newLength);
        
        for (let i = 0; i < newLength; i++) {
          const srcIndex = i * ratio;
          const srcIndexFloor = Math.floor(srcIndex);
          const srcIndexCeil = Math.min(srcIndexFloor + 1, monoAudio.length - 1);
          const fraction = srcIndex - srcIndexFloor;
          
          processedAudio[i] = monoAudio[srcIndexFloor] * (1 - fraction) + monoAudio[srcIndexCeil] * fraction;
        }
        
        console.log(`Resampled audio: ${processedAudio.length} samples at ${targetSampleRate}Hz`);
      } else {
        processedAudio = monoAudio;
        console.log('Audio already at 16kHz, no resampling needed');
      }
      
      await audioContext.close();

      // Return promise that resolves when transcription is complete
      return new Promise<TranscriberData | null>((resolve, reject) => {
        currentResolveRef.current = resolve;
        
        // Send to worker for transcription
        const modelId = progress.downloadMethod === 'chunked' 
          ? ENHANCED_MODEL_CONFIG.models.tiny // Use appropriate model
          : ENHANCED_MODEL_CONFIG.models.tiny;
          
        webWorker.postMessage({
          audio: processedAudio,
          model: modelId,
          multilingual: false,
          subtask: null,
          language: null,
        });
        
        // Set timeout in case something goes wrong
        setTimeout(() => {
          if (currentResolveRef.current === resolve) {
            currentResolveRef.current = null;
            setIsBusy(false);
            reject(new Error('Transcription timeout'));
          }
        }, 120000); // 2 minute timeout
      });
      
    } catch (err: any) {
      console.error('Enhanced transcription failed:', err);
      setError(`Transcription failed: ${err.message || err}`);
      setIsBusy(false);
      currentResolveRef.current = null;
      return null;
    }
  }, [progress.modelReady, progress.downloadMethod, webWorker]);

  /**
   * Reset state function
   */
  const resetState = useCallback(() => {
    console.log('Resetting enhanced transcription state');
    setTranscript(undefined);
    setIsBusy(false);
    setError(null);
    currentResolveRef.current = null;
  }, []);

  /**
   * Cancel ongoing download
   */
  const cancelDownload = useCallback(() => {
    console.log('Canceling enhanced download');
    if (chunkDownloadManagerRef.current) {
      chunkDownloadManagerRef.current.abort();
      chunkDownloadManagerRef.current = null;
    }
    resetState();
  }, [resetState]);

  return {
    transcribe,
    isTranscribing: isBusy,
    error,
    progress,
    resetState,
    cancelDownload
  };
};
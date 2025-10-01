import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSpeechRecording } from '@/hooks/useSpeechRecording';
import { useWhisperEnhanced } from '@/hooks/useWhisperEnhanced';
import { ChunkedModelProgress } from './ChunkedModelProgress';
import { ModelProgress } from './ModelProgress';
import { 
  Mic, 
  Square, 
  Play, 
  Pause, 
  RotateCcw, 
  Zap,
  Download,
  Server,
  Wifi
} from 'lucide-react';

export const EnhancedSpeechDemo: React.FC = () => {
  const [transcriptions, setTranscriptions] = useState<string[]>([]);
  
  const {
    isRecording,
    audioBlob,
    startRecording,
    stopRecording,
    error: recordingError,
    duration
  } = useSpeechRecording();

  const {
    transcribe,
    isTranscribing,
    error: transcriptionError,
    progress,
    resetState,
    cancelDownload
  } = useWhisperEnhanced();

  // Auto-transcribe when audio is available
  React.useEffect(() => {
    if (audioBlob && !isTranscribing && progress.modelReady) {
      handleTranscribe();
    }
  }, [audioBlob, isTranscribing, progress.modelReady]);

  const handleTranscribe = async () => {
    if (!audioBlob) return;
    
    try {
      const result = await transcribe(audioBlob);
      if (result?.text?.trim()) {
        setTranscriptions(prev => [...prev, result.text.trim()]);
      }
    } catch (error) {
      console.error('Transcription failed:', error);
    }
  };

  const handleRecordingToggle = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  };

  const clearAll = () => {
    setTranscriptions([]);
    resetState();
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getDownloadMethodIcon = (method: string) => {
    switch (method) {
      case 'chunked':
        return <Zap className="h-4 w-4 text-green-500" />;
      case 'fallback':
        return <Download className="h-4 w-4 text-orange-500" />;
      default:
        return <Server className="h-4 w-4 text-blue-500" />;
    }
  };

  const getDownloadMethodLabel = (method: string) => {
    switch (method) {
      case 'chunked':
        return 'Advanced Chunked Download';
      case 'fallback':
        return 'Fallback Download';
      default:
        return 'Original Download';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-blue-500" />
            Enhanced Whisper Web - Advanced Model Loading
          </CardTitle>
          <p className="text-muted-foreground">
            Featuring parallel chunked downloads with JWT authentication and zstd compression
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {getDownloadMethodIcon(progress.downloadMethod)}
            <span className="font-medium">
              {getDownloadMethodLabel(progress.downloadMethod)}
            </span>
            {progress.compressionStats && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <span>💾</span>
                <span>{progress.compressionStats.savings} compression savings</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Progress Display */}
      {progress.chunkedDownloadActive && progress.chunkedProgress && (
        <ChunkedModelProgress 
          progress={progress.chunkedProgress}
          isVisible={true}
        />
      )}

      {/* Fallback Progress Display */}
      {progress.downloadMethod === 'fallback' && !progress.chunkedDownloadActive && (
        <ModelProgress 
          progressItems={progress.progressItems}
          isModelLoading={progress.isModelLoading}
          modelReady={progress.modelReady}
        />
      )}

      {/* Recording Interface */}
      <Card>
        <CardHeader>
          <CardTitle>Voice Recording</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button
              onClick={handleRecordingToggle}
              disabled={!progress.modelReady || isTranscribing}
              variant={isRecording ? "destructive" : "default"}
              size="lg"
            >
              {isRecording ? (
                <>
                  <Square className="h-4 w-4 mr-2" />
                  Stop Recording
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 mr-2" />
                  Start Recording
                </>
              )}
            </Button>

            {progress.isModelLoading && (
              <Button onClick={cancelDownload} variant="outline">
                <RotateCcw className="h-4 w-4 mr-2" />
                Cancel Download
              </Button>
            )}
          </div>

          {isRecording && (
            <div className="flex items-center gap-2 text-red-600">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span>Recording... {formatDuration(duration)}</span>
            </div>
          )}

          {isTranscribing && (
            <div className="flex items-center gap-2 text-blue-600">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <span>Transcribing audio...</span>
            </div>
          )}

          {!progress.modelReady && (
            <div className="text-sm text-muted-foreground">
              {progress.chunkedDownloadActive 
                ? "Downloading model with advanced chunked method..."
                : "Loading model..."
              }
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Display */}
      {(recordingError || transcriptionError) && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-800 text-sm">
              {recordingError || transcriptionError}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Transcriptions */}
      {transcriptions.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Transcriptions</CardTitle>
            <Button onClick={clearAll} variant="outline" size="sm">
              <RotateCcw className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {transcriptions.map((text, index) => (
                <div key={index} className="p-3 bg-muted rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <p className="text-sm leading-relaxed">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Stats */}
      {progress.modelReady && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Performance Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Download Method</div>
                <div className="font-medium">{getDownloadMethodLabel(progress.downloadMethod)}</div>
              </div>
              
              {progress.compressionStats && (
                <>
                  <div>
                    <div className="text-muted-foreground">Original Size</div>
                    <div className="font-medium">
                      {(progress.compressionStats.originalSize / (1024*1024)).toFixed(1)} MB
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Compressed Size</div>
                    <div className="font-medium">
                      {(progress.compressionStats.compressedSize / (1024*1024)).toFixed(1)} MB
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Space Saved</div>
                    <div className="font-medium text-green-600">
                      {progress.compressionStats.savings}
                    </div>
                  </div>
                </>
              )}
              
              {progress.chunkedProgress && (
                <div>
                  <div className="text-muted-foreground">Parallel Chunks</div>
                  <div className="font-medium">{progress.chunkedProgress.totalChunks}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
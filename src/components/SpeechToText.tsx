import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Square, Loader2, Volume2, Download, Copy, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSpeechRecording } from '@/hooks/useSpeechRecording';
import { useWhisper, TranscriberData } from '@/hooks/useWhisper';
import { useAudioVisualizer } from '@/hooks/useAudioVisualizer';
import { AnimatedWaveform } from './AnimatedWaveform';
import { WhisperProgress } from './WhisperProgress';
import { WaterColorCanvas } from './WaterColorCanvas';
import { cn } from '@/lib/utils';

export const SpeechToText: React.FC = () => {
  const [transcriptions, setTranscriptions] = useState<TranscriberData[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState<string>('');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  
  const {
    isRecording,
    audioBlob,
    startRecording,
    stopRecording,
    error: recordingError,
    duration,
    stream,
  } = useSpeechRecording();

  const {
    audioLevel,
    isAnalyzing,
    startAnalyzing,
    stopAnalyzing,
  } = useAudioVisualizer();

  const {
    transcribe,
    isTranscribing,
    error: transcriptionError,
    isModelLoading,
    modelReady,
    progressItems,
    resetState,
  } = useWhisper();

  // Handle audio visualization when recording
  useEffect(() => {
    if (isRecording && stream) {
      startAnalyzing(stream);
    } else {
      stopAnalyzing();
    }
  }, [isRecording, stream, startAnalyzing, stopAnalyzing]);

  // Track processed blobs to prevent duplicate transcriptions
  const processedBlobsRef = useRef<Set<Blob>>(new Set());
  
  // Auto-transcribe when audio blob is available
  useEffect(() => {
    const performTranscription = async () => {
      // Only process if:
      // 1. We have an audioBlob
      // 2. We haven't processed this blob before
      // 3. We're not currently transcribing
      // 4. Model is ready
      if (audioBlob && 
          !processedBlobsRef.current.has(audioBlob) && 
          !isTranscribing && 
          modelReady) {
        
        console.log('Starting auto-transcription for new audio blob');
        processedBlobsRef.current.add(audioBlob);
        
        try {
          const result = await transcribe(audioBlob);
          if (result && result.text.trim()) {
            setTranscriptions(prev => [...prev, result]);
            setCurrentTranscript('');
          }
        } catch (error) {
          console.error('Transcription failed:', error);
        }
      }
    };
    
    performTranscription();
  }, [audioBlob, isTranscribing, modelReady, transcribe]);

  const handleRecordingToggle = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
      setIsMuted(false); // Reset mute when starting new recording
    }
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
  };

  const handleStop = () => {
    if (isRecording) {
      stopRecording();
    }
    setIsMuted(false);
  };

  const clearTranscriptions = () => {
    setTranscriptions([]);
    setCurrentTranscript('');
    processedBlobsRef.current.clear(); // Reset processed blobs
    resetState(); // Reset transcription state
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimestamp = (timestamp: [number, number | null]): string => {
    const [start, end] = timestamp;
    const formatTime = (time: number) => {
      const mins = Math.floor(time / 60);
      const secs = Math.floor(time % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };
    
    if (end === null) {
      return `${formatTime(start)}`;
    }
    return `${formatTime(start)} - ${formatTime(end)}`;
  };

  const hasError = recordingError || transcriptionError;
  const isProcessing = isTranscribing || isModelLoading;

  return (
    <div className="min-h-screen bg-white" style={{
      minHeight: '100vh',
      backgroundColor: 'white',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '2rem'
    }}>
      {/* Main Recording Interface */}
      <div className="max-w-4xl mx-auto text-center space-y-12" style={{
        maxWidth: '56rem',
        margin: '0 auto',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        gap: '3rem'
      }}>
        {/* Title */}
        <div>
          <h1 
            className="text-4xl font-bold text-gray-900 mb-4"
            style={{
              fontSize: '2.25rem',
              fontWeight: 'bold',
              color: '#111827',
              marginBottom: '1rem'
            }}
          >
            Whisper Web Speech-to-Text
          </h1>
          <p 
            className="text-lg text-gray-600"
            style={{
              fontSize: '1.125rem',
              color: '#6b7280'
            }}
          >
            Click the microphone to start recording, then speak clearly. Your speech will be automatically transcribed using Whisper AI.
          </p>
        </div>

        {/* Model Loading Progress is now handled by WaterColorCanvas */}

        {/* Water Color Canvas Recording Interface */}
        <div className="flex flex-col items-center" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <WaterColorCanvas
            isRecording={isRecording}
            audioLevel={audioLevel}
            onMicToggle={handleRecordingToggle}
            onStop={handleStop}
            onMuteToggle={handleMuteToggle}
            disabled={isProcessing || !modelReady}
            isMuted={isMuted}
            size={320}
            progressItems={progressItems}
            isModelLoading={isModelLoading}
            modelReady={modelReady}
          />
          
          {/* Additional Status */}
          <div className="text-center mt-4" style={{ textAlign: 'center', marginTop: '1rem' }}>
            {isRecording && (
              <p className="text-gray-600 font-medium" style={{ color: '#6b7280', fontWeight: '500', fontSize: '0.9rem' }}>
                Duration: {formatDuration(duration)}
              </p>
            )}
            {isTranscribing && (
              <p className="text-blue-600 font-medium" style={{ color: '#2563eb', fontWeight: '500', fontSize: '1rem' }}>🎵 Transcribing audio...</p>
            )}
          </div>
        </div>

        {/* Error Messages */}
        {hasError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md mx-auto" style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '0.5rem',
            padding: '1rem',
            maxWidth: '28rem',
            margin: '0 auto'
          }}>
            <p className="text-red-800 text-sm" style={{ color: '#991b1b', fontSize: '0.875rem' }}>
              {recordingError || transcriptionError}
            </p>
          </div>
        )}

        {/* Transcription Results */}
        {transcriptions.length > 0 && (
          <div className="w-full max-w-2xl mx-auto" style={{ width: '100%', maxWidth: '42rem', margin: '0 auto' }}>
            <div className="flex items-center justify-between mb-6" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 className="text-xl font-semibold text-gray-900" style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827' }}>Transcriptions</h2>
              <button
                onClick={clearTranscriptions}
                disabled={isProcessing}
                className="px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                style={{
                  padding: '0.25rem 0.75rem',
                  fontSize: '0.875rem',
                  color: '#4b5563',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.25rem',
                  backgroundColor: 'transparent',
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                  opacity: isProcessing ? 0.5 : 1
                }}
              >
                Clear All
              </button>
            </div>
            
            <div className="space-y-4" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {transcriptions.map((transcription, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg text-left" style={{
                  padding: '1rem',
                  backgroundColor: '#f9fafb',
                  borderRadius: '0.5rem',
                  textAlign: 'left'
                }}>
                  <div className="flex items-start space-x-3" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium" style={{
                      flexShrink: 0,
                      width: '1.5rem',
                      height: '1.5rem',
                      backgroundColor: '#dbeafe',
                      color: '#2563eb',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.875rem',
                      fontWeight: '500'
                    }}>
                      {index + 1}
                    </span>
                    <div className="flex-1" style={{ flex: 1 }}>
                      <div className="mb-2" style={{ marginBottom: '0.5rem' }}>
                        <p className="text-gray-900 leading-relaxed" style={{ color: '#111827', lineHeight: '1.7', margin: 0 }}>
                          {transcription.text}
                        </p>
                      </div>
                      
                      {/* Show individual chunks with timestamps if available */}
                      {transcription.chunks && transcription.chunks.length > 0 && (
                        <div className="space-y-2 mt-3 pt-3 border-t border-gray-200" style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem',
                          marginTop: '0.75rem',
                          paddingTop: '0.75rem',
                          borderTop: '1px solid #e5e7eb'
                        }}>
                          <div className="text-xs font-medium text-gray-600 mb-1" style={{
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            color: '#6b7280',
                            marginBottom: '0.25rem'
                          }}>
                            Segments:
                          </div>
                          {transcription.chunks.map((chunk, chunkIndex) => (
                            <div key={chunkIndex} className="flex items-start gap-2" style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '0.5rem'
                            }}>
                              <span className="text-xs text-gray-500 font-mono min-w-fit" style={{
                                fontSize: '0.75rem',
                                color: '#6b7280',
                                fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                                minWidth: 'fit-content'
                              }}>
                                [{formatTimestamp(chunk.timestamp)}]
                              </span>
                              <span className="text-xs text-gray-700" style={{
                                fontSize: '0.75rem',
                                color: '#374151'
                              }}>
                                {chunk.text.trim()}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Show transcription performance if available */}
                      {transcription.tps && (
                        <div className="text-xs text-gray-500 mt-2" style={{
                          fontSize: '0.75rem',
                          color: '#6b7280',
                          marginTop: '0.5rem'
                        }}>
                          Processing speed: {transcription.tps.toFixed(1)} tokens/sec
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Empty State */}
        {transcriptions.length === 0 && !currentTranscript && !isRecording && !isProcessing && (
          <div className="text-center py-8" style={{ textAlign: 'center', padding: '2rem 0' }}>
            <MicOff className="w-12 h-12 text-gray-400 mx-auto mb-4" style={{
              width: '3rem',
              height: '3rem',
              color: '#9ca3af',
              margin: '0 auto 1rem auto'
            }} />
            <p className="text-gray-500" style={{ color: '#6b7280' }}>No transcriptions yet</p>
            <p className="text-gray-400 text-sm mt-1" style={{ color: '#9ca3af', fontSize: '0.875rem', marginTop: '0.25rem' }}>Click the microphone button to start recording</p>
          </div>
        )}
      </div>
    </div>
  );
};
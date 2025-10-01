import { useState, useEffect, useRef, useCallback } from 'react';

interface AudioVisualizerReturn {
  audioLevel: number;
  isAnalyzing: boolean;
  startAnalyzing: (stream: MediaStream) => void;
  stopAnalyzing: () => void;
}

export const useAudioVisualizer = (): AudioVisualizerReturn => {
  const [audioLevel, setAudioLevel] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  const analyze = useCallback(() => {
    if (!analyzerRef.current || !dataArrayRef.current) return;

    analyzerRef.current.getByteFrequencyData(dataArrayRef.current);
    
    // Calculate average audio level
    const average = dataArrayRef.current.reduce((sum, value) => sum + value, 0) / dataArrayRef.current.length;
    const normalizedLevel = Math.min(average / 128, 1); // Normalize to 0-1
    
    setAudioLevel(normalizedLevel);

    if (isAnalyzing) {
      animationFrameRef.current = requestAnimationFrame(analyze);
    }
  }, [isAnalyzing]);

  const startAnalyzing = useCallback((stream: MediaStream) => {
    try {
      const audioContext = new AudioContext();
      const analyzer = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      analyzer.fftSize = 256;
      analyzer.smoothingTimeConstant = 0.8;
      
      source.connect(analyzer);
      
      const dataArray = new Uint8Array(analyzer.frequencyBinCount);
      
      audioContextRef.current = audioContext;
      analyzerRef.current = analyzer;
      dataArrayRef.current = dataArray;
      
      setIsAnalyzing(true);
    } catch (error) {
      console.error('Failed to start audio analysis:', error);
    }
  }, []);

  const stopAnalyzing = useCallback(() => {
    setIsAnalyzing(false);
    setAudioLevel(0);
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    analyzerRef.current = null;
    dataArrayRef.current = null;
  }, []);

  // Start animation loop when analyzing begins
  useEffect(() => {
    if (isAnalyzing && analyzerRef.current && dataArrayRef.current) {
      analyze();
    }
  }, [isAnalyzing, analyze]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAnalyzing();
    };
  }, [stopAnalyzing]);

  return {
    audioLevel,
    isAnalyzing,
    startAnalyzing,
    stopAnalyzing,
  };
};
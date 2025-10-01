import { useState, useRef, useCallback } from 'react';

interface UseSpeechRecordingReturn {
  isRecording: boolean;
  audioBlob: Blob | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  error: string | null;
  duration: number;
  stream: MediaStream | null;
}

export const useSpeechRecording = (): UseSpeechRecordingReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setAudioBlob(null);
      setDuration(0);

      // Check for browser compatibility
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support audio recording. Please use Chrome, Firefox, Safari, or Edge.');
      }

      if (!window.MediaRecorder) {
        throw new Error('MediaRecorder is not supported in your browser. Please update your browser.');
      }

      // Get user media with fallback constraints
      let constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: { ideal: 16000, min: 8000, max: 48000 },
          channelCount: { ideal: 1 },
        },
      };

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (constraintError) {
        console.warn('Failed with ideal constraints, trying basic ones:', constraintError);
        // Fallback to basic constraints if ideal ones fail
        constraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
          },
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      }

      streamRef.current = stream;
      chunksRef.current = [];

      // Try to find the best supported audio format
      const supportedTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4;codecs=mp4a.40.2',
        'audio/mp4',
        'audio/ogg;codecs=opus',
        'audio/ogg',
        'audio/wav',
        'audio/x-wav'
      ];
      
      let mimeType = null;
      let audioBitsPerSecond = 128000;
      
      for (const type of supportedTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          console.log('Using audio format:', type);
          break;
        }
      }
      
      // If no specific format is supported, try without specifying mimeType
      if (!mimeType) {
        console.warn('No specific audio format detected as supported, using browser default');
      }
      
      // Create MediaRecorder with or without mimeType
      let mediaRecorderOptions = {};
      if (mimeType) {
        mediaRecorderOptions.mimeType = mimeType;
      }
      
      // Try to set audio bitrate, but don't fail if it's not supported
      try {
        mediaRecorderOptions.audioBitsPerSecond = audioBitsPerSecond;
      } catch (e) {
        console.warn('Audio bitrate setting not supported');
      }
      
      const mediaRecorder = new MediaRecorder(stream, mediaRecorderOptions);

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Use the detected mimeType or fallback to webm
        const finalMimeType = mimeType || 'audio/webm';
        const audioBlob = new Blob(chunksRef.current, { type: finalMimeType });
        
        console.log('Recording stopped. Blob info:', {
          size: audioBlob.size,
          type: audioBlob.type,
          chunks: chunksRef.current.length
        });
        
        setAudioBlob(audioBlob);
        
        // Clean up
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
          durationIntervalRef.current = null;
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      // Start duration tracking
      startTimeRef.current = Date.now();
      durationIntervalRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);

    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Failed to start recording. Please check microphone permissions.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  return {
    isRecording,
    audioBlob,
    startRecording,
    stopRecording,
    error,
    duration,
    stream: streamRef.current,
  };
};
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Mic, MicOff, Square } from 'lucide-react';
import { SimpleCircularProgress } from '@/components/SimpleCircularProgress';

interface ProgressItem {
  file: string;
  loaded: number;
  progress: number;
  total: number;
  name: string;
  status: string;
  downloadSpeed?: number;
  timeRemaining?: number;
  startTime?: number;
}

interface AccentColorScheme {
  name: string;
  hues: number[];
  saturations: number[];
  lightnesses: number[];
}

interface WaterColorCanvasProps {
  isRecording: boolean;
  audioLevel: number;
  onMicToggle: () => void;
  onStop: () => void;
  disabled?: boolean;
  isMuted?: boolean;
  onMuteToggle?: () => void;
  size?: number;
  progressItems?: ProgressItem[];
  isModelLoading?: boolean;
  modelReady?: boolean;
}

interface WaterLayer {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hue: number;
  saturation: number;
  lightness: number;
  opacity: number;
  phase: number;
}

interface Circle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseR: number;
  hue: number;
}

export const WaterColorCanvas: React.FC<WaterColorCanvasProps> = ({
  isRecording,
  audioLevel,
  onMicToggle,
  onStop,
  disabled = false,
  isMuted = false,
  onMuteToggle,
  size = 300,
  progressItems = [],
  isModelLoading = false,
  modelReady = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const [muteStartTime, setMuteStartTime] = useState<number | null>(null);
  const [detectedAccent, setDetectedAccent] = useState<string>('neutral');
  
  // Color schemes for different accents/regions
  const accentColorSchemes: Record<string, AccentColorScheme> = {
    neutral: { name: 'Neutral', hues: [200, 210, 220, 230], saturations: [60, 75, 85, 90], lightnesses: [80, 65, 50, 40] },
    british: { name: 'British', hues: [260, 270, 280, 290], saturations: [70, 80, 85, 90], lightnesses: [75, 60, 45, 35] }, // Purple/violet
    american: { name: 'American', hues: [15, 25, 35, 45], saturations: [65, 75, 80, 85], lightnesses: [75, 60, 45, 35] }, // Orange/red
    australian: { name: 'Australian', hues: [120, 130, 140, 150], saturations: [70, 80, 85, 90], lightnesses: [70, 55, 40, 30] }, // Green
    irish: { name: 'Irish', hues: [90, 100, 110, 120], saturations: [75, 85, 90, 95], lightnesses: [65, 50, 35, 25] }, // Green-yellow
    scottish: { name: 'Scottish', hues: [300, 310, 320, 330], saturations: [60, 70, 80, 85], lightnesses: [70, 55, 40, 30] }, // Pink/magenta
    canadian: { name: 'Canadian', hues: [180, 190, 200, 210], saturations: [65, 75, 80, 85], lightnesses: [75, 60, 45, 35] }, // Cyan/blue
    indian: { name: 'Indian', hues: [60, 70, 80, 90], saturations: [80, 90, 95, 100], lightnesses: [70, 55, 40, 30] }, // Yellow-green
    french: { name: 'French', hues: [240, 250, 260, 270], saturations: [70, 80, 85, 90], lightnesses: [75, 60, 45, 35] }, // Blue-purple
    german: { name: 'German', hues: [340, 350, 0, 10], saturations: [65, 75, 80, 85], lightnesses: [70, 55, 40, 30] }, // Red
    spanish: { name: 'Spanish', hues: [30, 40, 50, 60], saturations: [85, 95, 100, 95], lightnesses: [75, 60, 45, 35] } // Orange-yellow
  };
  
  // Canvas animation state - centered circle that doesn't bounce
  const circleRef = useRef<Circle>({
    x: size / 2,
    y: size / 2,
    vx: 0, // No movement
    vy: 0, // No movement  
    baseR: 60, // Larger base size
    hue: 210, // Blue hue to match target
  });
  
  // Flowing water layers - multiple tones that move and blend
  const waterLayersRef = useRef<WaterLayer[]>([]);
  
  // Initialize water layers
  useEffect(() => {
    const centerX = size / 2;
    const centerY = size / 2;
    
    waterLayersRef.current = [
      // Light blue layer
      {
        x: centerX + Math.random() * 20 - 10,
        y: centerY + Math.random() * 20 - 10,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: 45,
        hue: 200,
        saturation: 60,
        lightness: 80,
        opacity: 0.4,
        phase: 0
      },
      // Medium blue layer
      {
        x: centerX + Math.random() * 15 - 7.5,
        y: centerY + Math.random() * 15 - 7.5,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        radius: 40,
        hue: 210,
        saturation: 75,
        lightness: 65,
        opacity: 0.5,
        phase: Math.PI / 2
      },
      // Darker blue layer
      {
        x: centerX + Math.random() * 10 - 5,
        y: centerY + Math.random() * 10 - 5,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        radius: 35,
        hue: 220,
        saturation: 85,
        lightness: 50,
        opacity: 0.6,
        phase: Math.PI
      },
      // Deep blue core
      {
        x: centerX,
        y: centerY,
        vx: (Math.random() - 0.5) * 0.1,
        vy: (Math.random() - 0.5) * 0.1,
        radius: 25,
        hue: 230,
        saturation: 90,
        lightness: 40,
        opacity: 0.7,
        phase: Math.PI * 1.5
      }
    ];
  }, [size]);
  
  // Calculate progress from progressItems
  const validItems = progressItems.filter(item => 
    typeof item.progress === 'number' && 
    !isNaN(item.progress) &&
    item.total > 0
  );
  
  const totalDownloaded = validItems.reduce((acc, item) => acc + (item.loaded || 0), 0);
  const totalSize = validItems.reduce((acc, item) => acc + (item.total || 0), 0);
  const progressRatio = totalSize > 0 ? totalDownloaded / totalSize : 0;
  const progressPercentage = Math.min(Math.max(Math.round(progressRatio * 100), 0), 100);
  const displayProgress = validItems.length === 0 ? 0 : progressPercentage;
  
  // Accent detection based on speech patterns (simplified)
  const detectAccent = useCallback((audioLevel: number) => {
    // This is a simplified demo - in reality you'd use more sophisticated analysis
    // For now, we'll simulate accent detection with different audio level patterns
    const time = Date.now();
    const patterns = {
      british: audioLevel > 0.15 && Math.sin(time * 0.001) > 0.5,
      american: audioLevel > 0.2 && Math.sin(time * 0.0015) > 0.3,
      australian: audioLevel > 0.18 && Math.cos(time * 0.0012) > 0.4,
      irish: audioLevel > 0.12 && Math.sin(time * 0.0008) > 0.6,
      scottish: audioLevel > 0.25 && Math.cos(time * 0.0018) > 0.2,
      canadian: audioLevel > 0.16 && Math.sin(time * 0.0014) > 0.1,
      indian: audioLevel > 0.22 && Math.cos(time * 0.0016) > 0.3,
      french: audioLevel > 0.14 && Math.sin(time * 0.0011) > 0.7,
      german: audioLevel > 0.19 && Math.cos(time * 0.0013) > 0.5,
      spanish: audioLevel > 0.21 && Math.sin(time * 0.0017) > 0.4
    };
    
    // Find the first matching pattern (in real implementation, use ML/AI)
    for (const [accent, matches] of Object.entries(patterns)) {
      if (matches) {
        setDetectedAccent(accent);
        return;
      }
    }
    
    // Fallback to neutral if no pattern matches
    if (audioLevel < 0.05) {
      setDetectedAccent('neutral');
    }
  }, []);
  
  // Update circle position based on canvas size changes
  useEffect(() => {
    circleRef.current.x = size / 2;
    circleRef.current.y = size / 2;
  }, [size]);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    // Clear canvas completely for clean redraw
    ctx.clearRect(0, 0, width, height);

    // Audio-reactive values
    const v = isRecording && !isMuted ? Math.min(audioLevel * 4, 1.0) : 0.2;
    const time = Date.now() * 0.001;
    
    // Detect accent based on audio patterns
    if (isRecording && !isMuted && audioLevel > 0.05) {
      detectAccent(audioLevel);
    }
    
    // Get current accent color scheme
    const colorScheme = accentColorSchemes[detectedAccent] || accentColorSchemes.neutral;
    
    // Update and draw each flowing water layer
    waterLayersRef.current.forEach((layer, index) => {
      // Gentle flowing movement with different speeds per layer
      const flowSpeed = 0.3 + index * 0.1;
      const waveAmplitude = 8 + v * 15;
      
      // Create flowing motion with sine waves
      layer.x = centerX + Math.sin(time * flowSpeed + layer.phase) * waveAmplitude;
      layer.y = centerY + Math.cos(time * flowSpeed * 0.7 + layer.phase) * waveAmplitude * 0.6;
      
      // Audio-reactive size changes
      const audioBoost = v * 30;
      const currentRadius = layer.radius + audioBoost;
      
      // Use accent-based colors with subtle variations
      const baseHue = colorScheme.hues[index] || colorScheme.hues[0];
      const baseSaturation = colorScheme.saturations[index] || colorScheme.saturations[0];
      const baseLightness = colorScheme.lightnesses[index] || colorScheme.lightnesses[0];
      
      const currentHue = baseHue + Math.sin(time * 0.5 + layer.phase) * 8;
      const currentSaturation = baseSaturation + v * 15;
      const currentLightness = baseLightness - v * 5; // Slightly darker with audio
      
      // Create flowing watercolor effect with multiple overlapping gradients
      ctx.save();
      ctx.globalCompositeOperation = index === 0 ? 'normal' : 'multiply';
      
      // Draw multiple organic blobs per layer for more fluid appearance
      for (let blob = 0; blob < 3; blob++) {
        const blobAngle = (blob / 3) * Math.PI * 2 + time * 0.2;
        const blobOffset = currentRadius * 0.3;
        const blobX = layer.x + Math.cos(blobAngle + layer.phase) * blobOffset;
        const blobY = layer.y + Math.sin(blobAngle + layer.phase) * blobOffset;
        const blobRadius = currentRadius * (0.7 + Math.sin(time * 0.8 + blob) * 0.3);
        
        // Create irregular, flowing gradient
        const grad = ctx.createRadialGradient(
          blobX, blobY, blobRadius * 0.1,
          blobX, blobY, blobRadius * 1.2
        );
        
        const alpha = layer.opacity * (0.8 + Math.sin(time * 0.6 + layer.phase + blob) * 0.2);
        
        grad.addColorStop(0, `hsla(${currentHue}, ${currentSaturation}%, ${currentLightness + 10}%, ${alpha})`);
        grad.addColorStop(0.4, `hsla(${currentHue}, ${currentSaturation}%, ${currentLightness}%, ${alpha * 0.8})`);
        grad.addColorStop(0.7, `hsla(${currentHue}, ${currentSaturation}%, ${currentLightness - 10}%, ${alpha * 0.4})`);
        grad.addColorStop(1, `hsla(${currentHue}, ${currentSaturation}%, ${currentLightness - 20}%, 0)`);
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(blobX, blobY, blobRadius, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.restore();
    });

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [isRecording, audioLevel, isMuted]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = size;
    canvas.height = size;

    // Prime background with clean white
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Only start animation when model is ready
    if (modelReady) {
      animate();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [animate, size, modelReady]);

  // Handle mute timeout
  useEffect(() => {
    if (isMuted && isRecording) {
      if (!muteStartTime) {
        setMuteStartTime(Date.now());
      } else {
        const elapsed = Date.now() - muteStartTime;
        if (elapsed > 500) {
          onStop();
          setMuteStartTime(null);
        }
      }
    } else {
      setMuteStartTime(null);
    }
  }, [isMuted, isRecording, muteStartTime, onStop]);

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Show loading state when model is loading */}
      {isModelLoading && !modelReady ? (
        <div className="flex flex-col items-center gap-4">
          <SimpleCircularProgress
            value={displayProgress}
            size={200}
            strokeWidth={16}
            className="drop-shadow-lg"
          />
          <div className="text-center">
            <div className="text-xl font-bold text-gray-900">
              Preparing your interview
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Canvas - Only show when model is ready */}
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={size}
              height={size}
              className="rounded-3xl shadow-xl"
              style={{
                background: '#ffffff',
                filter: isRecording ? 'brightness(1.02)' : 'brightness(1)',
                border: '1px solid rgba(148, 163, 184, 0.1)'
              }}
            />
        
            {/* Center microphone icon - Show when model is ready */}
            <div 
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              style={{
                color: isRecording && !isMuted ? '#fff' : isMuted ? '#ef4444' : '#6b7280',
                zIndex: 10
              }}
            >
              {isMuted ? (
                <MicOff className="w-12 h-12 drop-shadow-lg" />
              ) : (
                <Mic className="w-12 h-12 drop-shadow-lg" />
              )}
            </div>
          </div>

          {/* Control Buttons - Only show when model is ready */}
          <div className="flex items-center gap-4">
        {/* Mute/Unmute Button */}
        {onMuteToggle && isRecording && (
          <button
            onClick={onMuteToggle}
            disabled={disabled}
            className={`
              w-12 h-12 rounded-full transition-all duration-200 
              focus:outline-none focus:ring-4 focus:ring-gray-200
              ${isMuted 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {isMuted ? (
              <MicOff className="w-5 h-5 mx-auto" />
            ) : (
              <Mic className="w-5 h-5 mx-auto" />
            )}
          </button>
        )}

        {/* Main Record/Stop Button */}
        <button
          onClick={isRecording ? onStop : onMicToggle}
          disabled={disabled}
          className={`
            w-16 h-16 rounded-full transition-all duration-200 
            focus:outline-none focus:ring-4 focus:ring-blue-200
            ${isRecording 
              ? 'bg-red-500 hover:bg-red-600 text-white' 
              : 'bg-blue-500 hover:bg-blue-600 text-white'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          {isRecording ? (
            <Square className="w-6 h-6 mx-auto" />
          ) : (
            <Mic className="w-6 h-6 mx-auto" />
          )}
            </button>
          </div>

          {/* Status Text - Only show when model is ready */}
          <div className="text-center space-y-2">
            {/* Accent Detection Indicator */}
            {isRecording && !isMuted && detectedAccent !== 'neutral' && (
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/80 backdrop-blur-sm rounded-full border border-gray-200 shadow-sm">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: `hsl(${accentColorSchemes[detectedAccent]?.hues[0] || 200}, 70%, 60%)`
                  }}
                />
                <span className="text-xs font-medium text-gray-700">
                  {accentColorSchemes[detectedAccent]?.name || 'Unknown'} accent detected
                </span>
              </div>
            )}
            
            {isMuted && isRecording && (
              <p className="text-red-500 font-medium text-sm">
                🔇 Muted - Will stop in {Math.max(0, Math.ceil((500 - (Date.now() - (muteStartTime || Date.now()))) / 1000))}s
              </p>
            )}
            {isRecording && !isMuted && (
              <p className="text-blue-600 font-medium">🔴 Recording...</p>
            )}
            {!isRecording && (
              <p className="text-gray-500">Click to start recording</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};
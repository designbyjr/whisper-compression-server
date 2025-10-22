import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';

interface SpeakerColorScheme {
  name: string;
  hues: number[];
  saturations: number[];
  lightnesses: number[];
}

interface EnhancedWaterColorCanvasProps {
  isRecording: boolean;
  audioLevel: number;
  onMicToggle: () => void;
  onStop: () => void;
  disabled?: boolean;
  isMuted?: boolean;
  onMuteToggle?: () => void;
  size?: number;
  showControls?: boolean;
  showStatus?: boolean;
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

interface BouncingCircle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hue: number;
  saturation: number;
  lightness: number;
  opacity: number;
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    width: '100%',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  canvasWrapper: {
    position: 'relative' as const,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  canvas: {
    background: 'transparent'
  },
  overlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none' as const,
    zIndex: 10
  },
  controlsContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  button: {
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    outline: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  muteButton: {
    width: '48px',
    height: '48px'
  },
  recordButton: {
    width: '59px',
    height: '59px'
  },
  statusContainer: {
    textAlign: 'center' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px'
  },
  accentIndicator: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '4px 12px',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(8px)',
    borderRadius: '20px',
    border: '1px solid rgba(229, 231, 235, 1)',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
  },
  accentDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%'
  },
  accentText: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#374151'
  },
  statusText: {
    fontSize: '14px',
    fontWeight: '500',
    margin: '4px 0'
  }
};

// SVG Icons as React components
const MicIcon = ({ size = 19, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    <line x1="12" y1="19" x2="12" y2="23"/>
    <line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
);

const MicOffIcon = ({ size = 19, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <line x1="1" y1="1" x2="23" y2="23"/>
    <path d="M9 9v3a3 3 0 0 0 5.12 2.12l1.27-1.27A3 3 0 0 0 15 12V4a3 3 0 0 0-3-3 3 3 0 0 0-3 3v5"/>
    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
    <line x1="12" y1="19" x2="12" y2="23"/>
    <line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
);

const SquareIcon = ({ size = 19, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
    <rect x="6" y="6" width="12" height="12" rx="2"/>
  </svg>
);

export const EnhancedWaterColorCanvas: React.FC<EnhancedWaterColorCanvasProps> = ({
  isRecording,
  audioLevel,
  onMicToggle,
  onStop,
  disabled = false,
  isMuted = false,
  onMuteToggle,
  size = 300,
  showControls = true,
  showStatus = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const [muteStartTime, setMuteStartTime] = useState<number | null>(null);
  const [speakerColorScheme, setSpeakerColorScheme] = useState<string>('default');
  
  const clampedSize = useMemo(() => {
    if (!Number.isFinite(size)) {
      return 300;
    }
    return Math.max(100, Math.min(800, Math.round(size)));
  }, [size]);

  // Speaker color schemes for consistent visual identity
  const speakerColorSchemes: Record<string, SpeakerColorScheme> = {
    default: { name: 'Default', hues: [200, 220, 240, 260], saturations: [60, 70, 80, 85], lightnesses: [75, 60, 45, 35] },
    speaker1: { name: 'Speaker 1', hues: [15, 30, 45, 60], saturations: [70, 80, 85, 90], lightnesses: [70, 55, 40, 30] },
    speaker2: { name: 'Speaker 2', hues: [120, 150, 180, 210], saturations: [75, 80, 85, 90], lightnesses: [70, 55, 40, 30] },
    speaker3: { name: 'Speaker 3', hues: [270, 290, 310, 330], saturations: [65, 75, 80, 85], lightnesses: [70, 55, 40, 30] },
    speaker4: { name: 'Speaker 4', hues: [60, 80, 100, 120], saturations: [80, 85, 90, 95], lightnesses: [65, 50, 35, 25] }
  };

  // Flowing water layers
  const waterLayersRef = useRef<WaterLayer[]>([]);
  
  // Bouncing circles layer
  const bouncingCirclesRef = useRef<BouncingCircle[]>([]);

  // Initialize water layers
  useEffect(() => {
    const centerX = clampedSize / 2;
    const centerY = clampedSize / 2;
    
    waterLayersRef.current = [
      {
        x: centerX + Math.random() * 30 - 15,
        y: centerY + Math.random() * 30 - 15,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: 100, // 80 + 20px
        hue: 200,
        saturation: 60,
        lightness: 80,
        opacity: 0.4,
        phase: 0
      },
      {
        x: centerX + Math.random() * 22.5 - 11.25,
        y: centerY + Math.random() * 22.5 - 11.25,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        radius: 90, // 70 + 20px
        hue: 210,
        saturation: 75,
        lightness: 65,
        opacity: 0.5,
        phase: Math.PI / 2
      },
      {
        x: centerX + Math.random() * 15 - 7.5,
        y: centerY + Math.random() * 15 - 7.5,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        radius: 80, // 60 + 20px
        hue: 220,
        saturation: 85,
        lightness: 50,
        opacity: 0.6,
        phase: Math.PI
      },
      {
        x: centerX,
        y: centerY,
        vx: (Math.random() - 0.5) * 0.1,
        vy: (Math.random() - 0.5) * 0.1,
        radius: 70, // 50 + 20px
        hue: 230,
        saturation: 90,
        lightness: 40,
        opacity: 0.7,
        phase: Math.PI * 1.5
      }
    ];
  }, [clampedSize]);

  // Initialize bouncing circles
  useEffect(() => {
    const centerX = clampedSize / 2;
    const centerY = clampedSize / 2;
    
    bouncingCirclesRef.current = [
      {
        x: centerX - 80, // Start from left side of boundary
        y: centerY - 40,
        vx: 0.8, // Slow horizontal movement
        vy: 0.6, // Slow vertical movement
        radius: 25,
        hue: 180,
        saturation: 70,
        lightness: 60,
        opacity: 0.3
      },
      {
        x: centerX - 70,
        y: centerY + 30,
        vx: 0.7,
        vy: -0.5,
        radius: 20,
        hue: 160,
        saturation: 65,
        lightness: 65,
        opacity: 0.25
      },
      {
        x: centerX - 85,
        y: centerY,
        vx: 0.9,
        vy: 0.4,
        radius: 30,
        hue: 200,
        saturation: 75,
        lightness: 55,
        opacity: 0.35
      },
      {
        x: centerX - 60,
        y: centerY - 20,
        vx: 0.6,
        vy: 0.8,
        radius: 18,
        hue: 140,
        saturation: 60,
        lightness: 70,
        opacity: 0.2
      }
    ];
  }, [clampedSize]);

  // Load cached speaker color on mount
  useEffect(() => {
    const cachedSpeaker = localStorage.getItem('speakerColorScheme');
    if (cachedSpeaker && cachedSpeaker !== 'default') {
      setSpeakerColorScheme(cachedSpeaker);
    }
  }, []);

  // Speaker detection and color assignment with localStorage caching
  const assignSpeakerColor = useCallback((audioLevel: number) => {
    // Only assign color when someone is actively speaking
    if (audioLevel > 0.15 && isRecording && !isMuted) {
      // Check if we already have a cached speaker color
      const cachedSpeaker = localStorage.getItem('speakerColorScheme');
      
      if (!cachedSpeaker || cachedSpeaker === 'default') {
        // Assign a new speaker color based on audio characteristics
        const time = Date.now();
        const speakerKeys = ['speaker1', 'speaker2', 'speaker3', 'speaker4'];
        
        // Use audio level and time to determine speaker assignment
        const speakerIndex = Math.floor((audioLevel * 4 + Math.sin(time * 0.001)) * speakerKeys.length) % speakerKeys.length;
        const assignedSpeaker = speakerKeys[speakerIndex];
        
        // Cache the assignment
        localStorage.setItem('speakerColorScheme', assignedSpeaker);
        setSpeakerColorScheme(assignedSpeaker);
      } else {
        // Use cached speaker color
        setSpeakerColorScheme(cachedSpeaker);
      }
    } else if (audioLevel < 0.05) {
      // Return to default when silent
      setSpeakerColorScheme('default');
    }
  }, [isRecording, isMuted]);

  // Animation loop
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    ctx.clearRect(0, 0, width, height);

    // Create circular clipping path at the boundary circle (95px radius)
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, 95, 0, Math.PI * 2);
    ctx.clip();

    const v = isRecording && !isMuted ? Math.min(audioLevel * 4, 1.0) : 0.2;
    const time = Date.now() * 0.001;
    
    if (isRecording && !isMuted && audioLevel > 0.05) {
      assignSpeakerColor(audioLevel);
    }
    
    const colorScheme = speakerColorSchemes[speakerColorScheme] || speakerColorSchemes.default;
    
    waterLayersRef.current.forEach((layer, index) => {
      const flowSpeed = 0.3 + index * 0.1;
      const waveAmplitude = 8 + v * 15;
      
      layer.x = centerX + Math.sin(time * flowSpeed + layer.phase) * waveAmplitude;
      layer.y = centerY + Math.cos(time * flowSpeed * 0.7 + layer.phase) * waveAmplitude * 0.6;
      
      const audioBoost = v * 30;
      const currentRadius = layer.radius + audioBoost;
      
      const baseHue = colorScheme.hues[index] || colorScheme.hues[0];
      const baseSaturation = colorScheme.saturations[index] || colorScheme.saturations[0];
      const baseLightness = colorScheme.lightnesses[index] || colorScheme.lightnesses[0];
      
      const currentHue = baseHue + Math.sin(time * 0.5 + layer.phase) * 8;
      const currentSaturation = baseSaturation + v * 15;
      const currentLightness = baseLightness - v * 5;
      
      ctx.save();
      ctx.globalCompositeOperation = index === 0 ? 'source-over' : 'multiply';
      
      for (let blob = 0; blob < 3; blob++) {
        const blobAngle = (blob / 3) * Math.PI * 2 + time * 0.2;
        const blobOffset = currentRadius * 0.3;
        const blobX = layer.x + Math.cos(blobAngle + layer.phase) * blobOffset;
        const blobY = layer.y + Math.sin(blobAngle + layer.phase) * blobOffset;
        const blobRadius = currentRadius * (0.7 + Math.sin(time * 0.8 + blob) * 0.3);
        
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

    // Draw bouncing circles layer
    bouncingCirclesRef.current.forEach((circle) => {
      // Update position with boundary collision detection
      const centerX = width / 2;
      const centerY = height / 2;
      const boundaryRadius = 95;
      
      // Calculate new position
      circle.x += circle.vx;
      circle.y += circle.vy;
      
      // Check collision with circular boundary
      const distanceFromCenter = Math.sqrt(
        Math.pow(circle.x - centerX, 2) + Math.pow(circle.y - centerY, 2)
      );
      
      if (distanceFromCenter + circle.radius >= boundaryRadius) {
        // Calculate collision normal
        const normalX = (circle.x - centerX) / distanceFromCenter;
        const normalY = (circle.y - centerY) / distanceFromCenter;
        
        // Reflect velocity
        const dotProduct = circle.vx * normalX + circle.vy * normalY;
        circle.vx = circle.vx - 2 * dotProduct * normalX;
        circle.vy = circle.vy - 2 * dotProduct * normalY;
        
        // Move circle back inside boundary
        const targetDistance = boundaryRadius - circle.radius;
        circle.x = centerX + normalX * targetDistance;
        circle.y = centerY + normalY * targetDistance;
      }
      
      // Draw the bouncing circle
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      
      const grad = ctx.createRadialGradient(
        circle.x, circle.y, circle.radius * 0.1,
        circle.x, circle.y, circle.radius * 1.2
      );
      
      grad.addColorStop(0, `hsla(${circle.hue}, ${circle.saturation}%, ${circle.lightness + 15}%, ${circle.opacity})`);
      grad.addColorStop(0.5, `hsla(${circle.hue}, ${circle.saturation}%, ${circle.lightness}%, ${circle.opacity * 0.7})`);
      grad.addColorStop(1, `hsla(${circle.hue}, ${circle.saturation}%, ${circle.lightness - 15}%, 0)`);
      
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();
    });

    // Restore the clipping context
    ctx.restore();

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [isRecording, audioLevel, isMuted, assignSpeakerColor, speakerColorSchemes, speakerColorScheme]);

  // Canvas setup and animation start
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = clampedSize;
    canvas.height = clampedSize;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [animate, clampedSize]);

  // Mute timeout handler
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

  // Dynamic styles
  const canvasWrapperStyle = {
    ...styles.canvasWrapper,
    width: `${clampedSize}px`,
    height: `${clampedSize}px`
  };

  const canvasStyle = {
    ...styles.canvas,
    width: `${clampedSize}px`,
    height: `${clampedSize}px`,
    filter: isRecording ? 'brightness(1.02)' : 'brightness(1)'
  };

  const overlayStyle = {
    ...styles.overlay,
    color: isRecording && !isMuted ? '#fff' : isMuted ? '#ef4444' : '#6b7280'
  };

  const getMuteButtonStyle = () => ({
    ...styles.button,
    ...styles.muteButton,
    backgroundColor: isMuted ? '#ef4444' : '#e5e7eb',
    color: isMuted ? '#ffffff' : '#374151',
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer'
  });

  const getRecordButtonStyle = () => ({
    ...styles.button,
    ...styles.recordButton,
    backgroundColor: isRecording ? '#ef4444' : '#3b82f6',
    color: '#ffffff',
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer'
  });

  return (
    <div style={styles.container}>
      <div style={canvasWrapperStyle}>
        <canvas
          ref={canvasRef}
          width={clampedSize}
          height={clampedSize}
          style={canvasStyle}
        />
      </div>

      {showControls && (
        <div style={styles.controlsContainer}>
          {onMuteToggle && isRecording && (
            <button
              onClick={onMuteToggle}
              disabled={disabled}
              style={getMuteButtonStyle()}
              aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {isMuted ? <MicOffIcon size={20} /> : <MicIcon size={20} />}
            </button>
          )}

          <button
            onClick={isRecording ? onStop : onMicToggle}
            disabled={disabled}
            style={getRecordButtonStyle()}
            aria-label={isRecording ? 'Stop recording' : 'Start recording'}
          >
            {isRecording ? <SquareIcon size={24} /> : <MicIcon size={24} />}
          </button>
        </div>
      )}

      {showStatus && (
        <div style={styles.statusContainer}>
          
          {isMuted && isRecording && (
            <p style={{ ...styles.statusText, color: '#ef4444' }}>
              🔇 Muted - Will stop in {Math.max(0, Math.ceil((500 - (Date.now() - (muteStartTime || Date.now()))) / 1000))}s
            </p>
          )}
          {isRecording && !isMuted && (
            <p style={{ ...styles.statusText, color: '#2563eb' }}>🔴 Recording...</p>
          )}
          {!isRecording && (
            <p style={{ ...styles.statusText, color: '#6b7280' }}>Click to start recording</p>
          )}
        </div>
      )}
    </div>
  );
};
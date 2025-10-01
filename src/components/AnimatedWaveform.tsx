import React, { useEffect, useRef } from 'react';

interface AnimatedWaveformProps {
  audioLevel: number;
  isRecording: boolean;
  size?: number;
}

export const AnimatedWaveform: React.FC<AnimatedWaveformProps> = ({ 
  audioLevel, 
  isRecording, 
  size = 128 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = size / 2;
    const centerY = size / 2;
    const baseRadius = size * 0.3;

    const animate = () => {
      timeRef.current += 0.1;
      
      // Clear canvas
      ctx.clearRect(0, 0, size, size);

      // Create multiple wave layers for watercolor effect
      const waves = [
        { 
          radius: baseRadius * (0.8 + audioLevel * 0.4),
          color: `rgba(59, 130, 246, ${0.3 + audioLevel * 0.2})`,
          frequency: 4,
          amplitude: 8 + audioLevel * 12,
          phase: timeRef.current
        },
        { 
          radius: baseRadius * (0.9 + audioLevel * 0.3),
          color: `rgba(147, 197, 253, ${0.4 + audioLevel * 0.3})`,
          frequency: 6,
          amplitude: 6 + audioLevel * 10,
          phase: timeRef.current * 1.3
        },
        { 
          radius: baseRadius * (1.0 + audioLevel * 0.2),
          color: `rgba(219, 234, 254, ${0.5 + audioLevel * 0.2})`,
          frequency: 8,
          amplitude: 4 + audioLevel * 8,
          phase: timeRef.current * 0.8
        },
        { 
          radius: baseRadius * (1.1 + audioLevel * 0.1),
          color: `rgba(239, 246, 255, ${0.6 + audioLevel * 0.1})`,
          frequency: 10,
          amplitude: 3 + audioLevel * 6,
          phase: timeRef.current * 1.5
        }
      ];

      // Draw waves from largest to smallest for layering effect
      waves.reverse().forEach(wave => {
        ctx.beginPath();
        ctx.fillStyle = wave.color;
        
        // Create organic wave shape
        for (let angle = 0; angle <= Math.PI * 2; angle += 0.02) {
          const waveAmplitude = Math.sin(angle * wave.frequency + wave.phase) * wave.amplitude;
          const radius = wave.radius + waveAmplitude;
          
          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;
          
          if (angle === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        
        ctx.closePath();
        ctx.fill();
      });

      // Add central glow effect when recording
      if (isRecording) {
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, baseRadius * 0.5);
        gradient.addColorStop(0, `rgba(255, 255, 255, ${0.8 + audioLevel * 0.2})`);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [audioLevel, isRecording, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="absolute inset-0 pointer-events-none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: size,
        height: size,
        pointerEvents: 'none',
        filter: 'blur(1px)' // Subtle blur for watercolor effect
      }}
    />
  );
};

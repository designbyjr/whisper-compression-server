import React from 'react';
import { EnhancedWaterColorCanvas } from './EnhancedWaterColorCanvas';

const pageStyles = {
  container: {
    minHeight: '100vh',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef7ed',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    padding: '20px',
    boxSizing: 'border-box' as const
  },
  content: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '32px',
    maxWidth: '800px',
    width: '100%'
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center' as const,
    margin: 0
  },
  subtitle: {
    fontSize: '18px',
    color: '#6b7280',
    textAlign: 'center' as const,
    margin: 0,
    maxWidth: '600px'
  },
  features: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px',
    width: '100%',
    marginTop: '20px'
  },
  featureCard: {
    backgroundColor: '#ffffff',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    border: '1px solid rgba(229, 231, 235, 1)'
  },
  featureTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#111827',
    margin: '0 0 8px 0'
  },
  featureDescription: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
    lineHeight: '1.5'
  }
};

export const TestPage: React.FC = () => {
  const [isRecording, setIsRecording] = React.useState(false);
  const [isMuted, setIsMuted] = React.useState(false);
  const [audioLevel, setAudioLevel] = React.useState(0);

  // Simulate audio level changes
  React.useEffect(() => {
    if (!isRecording || isMuted) {
      setAudioLevel(0);
      return;
    }

    const interval = setInterval(() => {
      // Simulate varying audio levels
      const baseLevel = 0.1 + Math.random() * 0.3;
      const spike = Math.random() > 0.8 ? Math.random() * 0.4 : 0;
      setAudioLevel(Math.min(baseLevel + spike, 1.0));
    }, 100);

    return () => clearInterval(interval);
  }, [isRecording, isMuted]);

  const handleMicToggle = () => {
    setIsRecording(!isRecording);
    if (isRecording) {
      setIsMuted(false);
    }
  };

  const handleStop = () => {
    setIsRecording(false);
    setIsMuted(false);
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
  };

  return (
    <div style={pageStyles.container}>
      <div style={pageStyles.content}>
        <div>
          <h1 style={pageStyles.title}>Enhanced WaterColor Canvas</h1>
          <p style={pageStyles.subtitle}>
            A beautiful, responsive canvas component with watercolor effects, accent detection, 
            and audio reactivity - built with vanilla CSS and no external dependencies.
          </p>
        </div>

        <EnhancedWaterColorCanvas
          isRecording={isRecording}
          audioLevel={audioLevel}
          onMicToggle={handleMicToggle}
          onStop={handleStop}
          isMuted={isMuted}
          onMuteToggle={handleMuteToggle}
          size={230}
          showControls={true}
          showStatus={true}
        />


      </div>
    </div>
  );
};
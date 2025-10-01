import React, { useState } from 'react';
import { SpeechToText } from './components/SpeechToText';
import { ProgressShowcase } from './components/ProgressShowcase';
import { Button } from '@/components/ui/button';

export default function App() {
  const [showDemo, setShowDemo] = useState(false);

  return (
    <div>
      {/* Toggle button for easy testing */}
      <div className="fixed top-4 right-4 z-50">
        <Button
          onClick={() => setShowDemo(!showDemo)}
          variant="outline"
          size="sm"
        >
          {showDemo ? 'Show Speech App' : 'Show Progress Demo'}
        </Button>
      </div>

      {/* Render either the demo or the main app */}
      {showDemo ? <ProgressShowcase /> : <SpeechToText />}
    </div>
  );
}
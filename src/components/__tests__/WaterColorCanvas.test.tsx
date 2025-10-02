import { render, screen } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';
import { WaterColorCanvas } from '../WaterColorCanvas';

describe('WaterColorCanvas accessibility', () => {
  it('provides descriptive labels for microphone controls', () => {
    const onMicToggle = vi.fn();
    const onStop = vi.fn();
    const onMuteToggle = vi.fn();

    const { rerender } = render(
      <WaterColorCanvas
        isRecording
        audioLevel={0}
        onMicToggle={onMicToggle}
        onStop={onStop}
        disabled={false}
        isMuted={false}
        onMuteToggle={onMuteToggle}
        size={240}
        modelReady
      />
    );

    expect(screen.getByRole('button', { name: /mute microphone/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /stop recording/i })).toBeInTheDocument();

    rerender(
      <WaterColorCanvas
        isRecording
        audioLevel={0}
        onMicToggle={onMicToggle}
        onStop={onStop}
        disabled={false}
        isMuted
        onMuteToggle={onMuteToggle}
        size={240}
        modelReady
      />
    );

    expect(screen.getByRole('button', { name: /unmute microphone/i })).toBeInTheDocument();

    rerender(
      <WaterColorCanvas
        isRecording={false}
        audioLevel={0}
        onMicToggle={onMicToggle}
        onStop={onStop}
        disabled={false}
        isMuted={false}
        onMuteToggle={onMuteToggle}
        size={240}
        modelReady
      />
    );

    expect(screen.getByRole('button', { name: /start recording/i })).toBeInTheDocument();
  });
});

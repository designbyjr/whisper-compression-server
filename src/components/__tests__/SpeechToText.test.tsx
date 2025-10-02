import { render, screen, waitFor } from '@testing-library/react';
import React, { act } from 'react';
import { vi } from 'vitest';
import { SpeechToText } from '../SpeechToText';

declare global {
  // eslint-disable-next-line no-var
  var __resizeObservers: Set<{ callback: (entries: ResizeObserverEntry[]) => void; target: Element | null }>;
}

vi.mock('@/hooks/useSpeechRecording', () => ({
  useSpeechRecording: () => ({
    isRecording: false,
    audioBlob: null,
    startRecording: vi.fn(),
    stopRecording: vi.fn(),
    error: null,
    duration: 0,
    stream: null,
  }),
}));

vi.mock('@/hooks/useAudioVisualizer', () => ({
  useAudioVisualizer: () => ({
    audioLevel: 0,
    isAnalyzing: false,
    startAnalyzing: vi.fn(),
    stopAnalyzing: vi.fn(),
  }),
}));

vi.mock('@/hooks/useWhisper', () => ({
  useWhisper: () => ({
    transcribe: vi.fn(),
    isTranscribing: false,
    error: null,
    isModelLoading: false,
    modelReady: true,
    progressItems: [],
    resetState: vi.fn(),
  }),
}));

vi.mock('../AnimatedWaveform', () => ({
  AnimatedWaveform: () => null,
}));

vi.mock('../WhisperProgress', () => ({
  WhisperProgress: () => null,
}));

describe('SpeechToText responsive canvas sizing', () => {
  it('passes the available width to the canvas', async () => {
    render(<SpeechToText />);

    const container = screen.getByTestId('canvas-container');

    Object.defineProperty(container, 'getBoundingClientRect', {
      value: () => ({
        width: 260,
        height: 260,
        top: 0,
        left: 0,
        right: 260,
        bottom: 260,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });

    await act(async () => {
      globalThis.__resizeObservers.forEach((entry) => {
        if (entry.target === container) {
          entry.callback([
            {
              target: container,
              contentRect: container.getBoundingClientRect(),
            } as ResizeObserverEntry,
          ]);
        }
      });
    });

    await waitFor(() => {
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;
      expect(canvas).not.toBeNull();
      expect(canvas.width).toBe(260);
    });
  });
});

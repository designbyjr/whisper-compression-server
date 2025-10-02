import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

const raf = (callback: FrameRequestCallback): number => {
  return window.setTimeout(() => {
    callback(performance.now());
  }, 16);
};

const caf = (handle: number): void => {
  clearTimeout(handle);
};

vi.stubGlobal('requestAnimationFrame', raf);
vi.stubGlobal('cancelAnimationFrame', caf);

const mockCanvasContext = {
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  beginPath: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  createRadialGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
  globalCompositeOperation: '',
  fillStyle: '',
} as unknown as CanvasRenderingContext2D;

HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCanvasContext);

interface ResizeObserverEntryLike {
  target: Element;
  contentRect: DOMRectReadOnly;
}

type ResizeObserverCallbackLike = (entries: ResizeObserverEntryLike[]) => void;

const resizeObservers = new Set<{ callback: ResizeObserverCallbackLike; target: Element | null }>();

class ResizeObserverMock {
  callback: ResizeObserverCallbackLike;

  constructor(callback: ResizeObserverCallbackLike) {
    this.callback = callback;
    resizeObservers.add({ callback, target: null });
  }

  observe(target: Element) {
    const rect = target.getBoundingClientRect();
    this.callback([
      {
        target,
        contentRect: rect,
      } as ResizeObserverEntryLike,
    ]);
    const stored = Array.from(resizeObservers).find((entry) => entry.callback === this.callback);
    if (stored) {
      stored.target = target;
    }
  }

  unobserve() {
    // no-op
  }

  disconnect() {
    const stored = Array.from(resizeObservers).find((entry) => entry.callback === this.callback);
    if (stored) {
      resizeObservers.delete(stored);
    }
  }
}

vi.stubGlobal('ResizeObserver', ResizeObserverMock as unknown as typeof ResizeObserver);

Object.defineProperty(globalThis, '__resizeObservers', {
  value: resizeObservers,
  writable: false,
});

import '@testing-library/jest-dom/vitest';

// jsdom no implementa ResizeObserver (lo usa el Ruler). Stub no-op:
// el componente usa su tamaño inicial por defecto (320x480) para dibujar.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;

// jsdom no implementa matchMedia (lo usa ThemeProvider)
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

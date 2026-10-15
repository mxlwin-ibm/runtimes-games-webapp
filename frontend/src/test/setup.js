import '@testing-library/jest-dom/vitest';

// jsdom lacks ResizeObserver, which Carbon components use.
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// jsdom lacks matchMedia, which Carbon's responsive hooks use.
window.matchMedia = window.matchMedia || ((query) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener() {},
  removeListener() {},
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() { return false; },
}));

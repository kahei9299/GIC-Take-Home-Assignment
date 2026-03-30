import "@testing-library/jest-dom/vitest";

import "@/components/grid/registerGridModules";
import { server } from "@/test/server";

// Ant Design's responsive primitives depend on browser APIs that jsdom does
// not provide by default.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

class ResizeObserverMock {
  observe() {}

  unobserve() {}

  disconnect() {}
}

// Keep MSW lifecycle global so individual tests only override the handlers
// relevant to the scenario they are asserting.
vi.stubGlobal("ResizeObserver", ResizeObserverMock);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

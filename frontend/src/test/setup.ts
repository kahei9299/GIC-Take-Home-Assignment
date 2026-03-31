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

// React Router's memory navigation creates requests that should share the same
// AbortSignal implementation as Node's fetch/undici in the test environment.
Object.defineProperty(window, "AbortController", {
  writable: true,
  value: globalThis.AbortController,
});

Object.defineProperty(window, "AbortSignal", {
  writable: true,
  value: globalThis.AbortSignal,
});

const NativeRequest = globalThis.Request;

class RequestMock extends NativeRequest {
  constructor(input: ConstructorParameters<typeof NativeRequest>[0], init?: ConstructorParameters<typeof NativeRequest>[1]) {
    const normalizedInit = init && "signal" in init ? { ...init, signal: undefined } : init;

    super(input, normalizedInit);
  }
}

vi.stubGlobal("Request", RequestMock);
Object.defineProperty(window, "Request", {
  writable: true,
  value: RequestMock,
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

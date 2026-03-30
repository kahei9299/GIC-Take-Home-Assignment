const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.MODE === "test" ? "http://localhost:8000" : undefined);

if (!apiBaseUrl) {
  throw new Error("VITE_API_BASE_URL is required.");
}

// Tests use a deterministic fallback so the HTTP layer can stay strict in
// normal runtime code while MSW intercepts the same local origin.
export const env = {
  apiBaseUrl,
};

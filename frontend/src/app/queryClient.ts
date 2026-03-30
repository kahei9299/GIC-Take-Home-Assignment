import { QueryClient } from "@tanstack/react-query";

import { ApiError, isSafeRetryableError } from "@/api/http";

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Only retry errors that the HTTP client has classified as safe GET
        // failures; write paths stay opt-in and mutation retries stay disabled.
        retry(failureCount, error) {
          if (!(error instanceof ApiError)) {
            return false;
          }

          return failureCount < 2 && isSafeRetryableError(error);
        },
        retryDelay(attemptIndex) {
          return Math.min(250 * 2 ** attemptIndex, 1_000);
        },
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

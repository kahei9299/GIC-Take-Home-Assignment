import { env } from "@/app/env";
import type { BackendErrorEnvelope } from "@/api/contracts";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

type RequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  signal?: AbortSignal;
};

const SAFE_METHODS = new Set<HttpMethod>(["GET"]);

function isBackendErrorEnvelope(value: unknown): value is BackendErrorEnvelope {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.code === "string" &&
    typeof candidate.message === "string" &&
    "details" in candidate
  );
}

export class ApiError extends Error {
  status: number | null;
  code: string;
  details: unknown;
  method: HttpMethod;
  retryable: boolean;

  constructor({
    message,
    status,
    code,
    details,
    method,
    retryable,
  }: {
    message: string;
    status: number | null;
    code: string;
    details: unknown;
    method: HttpMethod;
    retryable: boolean;
  }) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.method = method;
    this.retryable = retryable;
  }
}

function buildUrl(path: string, query?: Record<string, string | undefined>) {
  const url = new URL(path, env.apiBaseUrl);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

async function parseBody(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  return response.json();
}

export async function requestJson<T>(
  path: string,
  { method = "GET", body, signal }: RequestOptions = {},
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(buildUrl(path), {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (error) {
    // Network failures are normalized into one error shape so React Query and
    // UI components do not need transport-specific branching.
    throw new ApiError({
      message: "The backend is unreachable right now.",
      status: null,
      code: error instanceof DOMException && error.name === "AbortError" ? "REQUEST_ABORTED" : "NETWORK_ERROR",
      details: error,
      method,
      retryable: SAFE_METHODS.has(method),
    });
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = await parseBody(response);

  if (!response.ok) {
    const envelope = isBackendErrorEnvelope(payload) ? payload : null;

    // The backend already emits a stable error envelope; preserve that when it
    // exists and fall back to a generic HTTP error otherwise.
    throw new ApiError({
      message: envelope?.message ?? `Request failed with status ${response.status}.`,
      status: response.status,
      code: envelope?.code ?? "HTTP_ERROR",
      details: envelope?.details ?? payload,
      method,
      retryable: SAFE_METHODS.has(method) && response.status >= 500,
    });
  }

  return payload as T;
}

export function isSafeRetryableError(error: ApiError) {
  return error.retryable && SAFE_METHODS.has(error.method);
}

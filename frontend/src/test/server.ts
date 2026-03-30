import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

const defaultApiBaseUrl = "http://localhost:8000";

export const server = setupServer(
  http.get(`${defaultApiBaseUrl}/health`, () => HttpResponse.json({ status: "ok" })),
);

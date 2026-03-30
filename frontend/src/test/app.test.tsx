import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";

import { BackendHealthCard } from "@/routes/shared/BackendHealthCard";
import { renderRoute, renderWithProviders } from "@/test/renderApp";
import { server } from "@/test/server";

describe("frontend foundation routes", () => {
  it("renders the shared shell navigation and cafe route placeholder", async () => {
    renderRoute("/cafes");

    expect(await screen.findByRole("heading", { name: "GIC Cafe Manager" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cafes" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Employees" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Cafes" })).toBeInTheDocument();
    expect(screen.getByText(/Cafe list foundation/i)).toBeInTheDocument();
  });

  it("resolves deep routes for future page slices", async () => {
    renderRoute("/employees/new");

    expect(await screen.findByRole("heading", { name: "Create Employee" })).toBeInTheDocument();
    expect(screen.getByText(/Employee create form deferred/i)).toBeInTheDocument();
  });
});

describe("backend health query state", () => {
  it("shows a retryable error state for a failed safe read and recovers after retry", async () => {
    let requestCount = 0;

    server.use(
      http.get("http://localhost:8000/health", () => {
        requestCount += 1;

        if (requestCount <= 3) {
          return HttpResponse.error();
        }

        return HttpResponse.json({ status: "ok" });
      }),
    );

    const user = userEvent.setup();
    renderWithProviders(<BackendHealthCard />);

    expect(await screen.findByText(/Unable to reach the backend/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Retry request" }));

    expect(await screen.findByText("ok")).toBeInTheDocument();
  });
});

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";

import { BackendHealthCard } from "@/routes/shared/BackendHealthCard";
import { renderRoute, renderWithProviders } from "@/test/renderApp";
import { defaultCafeFixtures, server } from "@/test/server";

describe("cafe list route", () => {
  it("renders the shell and the cafe list from the backend", async () => {
    renderRoute("/cafes");

    expect(await screen.findByRole("heading", { name: "GIC Cafe Manager" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Cafes" })).toBeInTheDocument();
    expect(await screen.findByRole("gridcell", { name: "Central Perk" })).toBeInTheDocument();
    expect(screen.getByRole("gridcell", { name: "Harbour Grounds" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "8 employees" })).toHaveAttribute(
      "href",
      "/employees?cafe_id=cafe-central-1",
    );
    expect(screen.getByRole("link", { name: /Add Cafe/i })).toHaveAttribute("href", "/cafes/new");
    expect(screen.getByRole("link", { name: "Edit Central Perk" })).toHaveAttribute(
      "href",
      "/cafes/cafe-central-1/edit",
    );
  });

  it("shows a loading state before the cafe list resolves", async () => {
    server.use(
      http.get("http://localhost:8000/cafes", async () => {
        await delay(150);
        return HttpResponse.json(defaultCafeFixtures);
      }),
    );

    renderRoute("/cafes");

    expect(screen.getByText("Loading cafes")).toBeInTheDocument();
    expect(await screen.findByRole("gridcell", { name: "Central Perk" })).toBeInTheDocument();
  });

  it("keeps typing local until apply is clicked, then asks the backend for the filtered list", async () => {
    const requestedLocations: string[] = [];

    server.use(
      http.get("http://localhost:8000/cafes", ({ request }) => {
        const url = new URL(request.url);
        const location = url.searchParams.get("location") ?? "";
        requestedLocations.push(location);

        const filteredRows = location
          ? defaultCafeFixtures.filter((cafe) => cafe.location === location)
          : defaultCafeFixtures;

        return HttpResponse.json(filteredRows);
      }),
    );

    const user = userEvent.setup();
    renderRoute("/cafes");

    expect(await screen.findByRole("gridcell", { name: "Central Perk" })).toBeInTheDocument();
    expect(requestedLocations).toEqual([""]);

    await user.type(screen.getByRole("textbox", { name: "Location filter" }), "Harbourfront");

    expect(requestedLocations).toEqual([""]);

    await user.click(screen.getByRole("button", { name: "Apply" }));

    await waitFor(() => expect(requestedLocations).toEqual(["", "Harbourfront"]));
    expect(await screen.findByRole("gridcell", { name: "Harbour Grounds" })).toBeInTheDocument();
    expect(screen.queryByRole("gridcell", { name: "Central Perk" })).not.toBeInTheDocument();
  });

  it("clears the local filter and returns to the full list", async () => {
    const user = userEvent.setup();
    renderRoute("/cafes");

    expect(await screen.findByRole("gridcell", { name: "Central Perk" })).toBeInTheDocument();

    await user.type(screen.getByRole("textbox", { name: "Location filter" }), "Harbourfront");
    await user.click(screen.getByRole("button", { name: "Apply" }));
    await screen.findByRole("gridcell", { name: "Harbour Grounds" });

    await user.click(screen.getByRole("button", { name: "Clear" }));

    await screen.findByRole("gridcell", { name: "Central Perk" });
    expect(screen.getByRole("textbox", { name: "Location filter" })).toHaveValue("");
  });

  it("shows a retryable error state and recovers when the backend becomes reachable", async () => {
    let requestCount = 0;

    server.use(
      http.get("http://localhost:8000/cafes", () => {
        requestCount += 1;

        if (requestCount <= 3) {
          return HttpResponse.error();
        }

        return HttpResponse.json(defaultCafeFixtures);
      }),
    );

    const user = userEvent.setup();
    renderRoute("/cafes");

    expect(await screen.findByText("Unable to load cafes")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Retry request" }));

    expect(await screen.findByRole("gridcell", { name: "Central Perk" })).toBeInTheDocument();
  });
});

describe("shared routes and query state", () => {
  it("resolves deep routes for future page slices", async () => {
    renderRoute("/employees/new");

    expect(await screen.findByRole("heading", { name: "Create Employee" })).toBeInTheDocument();
    expect(screen.getByText(/Employee create form deferred/i)).toBeInTheDocument();
  });

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

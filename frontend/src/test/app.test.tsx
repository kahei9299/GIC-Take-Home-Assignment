import { act, screen, waitFor } from "@testing-library/react";
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
  it("renders the cafe create form fields", async () => {
    renderRoute("/cafes/new");

    expect(await screen.findByRole("heading", { name: "Create Cafe" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Name" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Description" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Location" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Logo URL" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Cafe" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("blocks empty submission with required-field validation", async () => {
    const user = userEvent.setup();
    renderRoute("/cafes/new");

    await user.click(await screen.findByRole("button", { name: "Create Cafe" }));

    expect(await screen.findByText("Enter a cafe name.")).toBeInTheDocument();
    expect(screen.getByText("Enter a description.")).toBeInTheDocument();
    expect(screen.getByText("Enter a location.")).toBeInTheDocument();
  });

  it("creates a cafe, trims the payload, invalidates the list query, and returns to /cafes", async () => {
    const createdCafes = [...defaultCafeFixtures];
    const requestedPayloads: Array<Record<string, unknown>> = [];
    let cafeListRequestCount = 0;

    server.use(
      http.get("http://localhost:8000/cafes", () => {
        cafeListRequestCount += 1;
        return HttpResponse.json(createdCafes);
      }),
      http.post("http://localhost:8000/cafes", async ({ request }) => {
        const payload = (await request.json()) as Record<string, unknown>;
        requestedPayloads.push(payload);

        const createdCafe = {
          id: "cafe-new-1",
          employees: 0,
          name: String(payload.name),
          description: String(payload.description),
          location: String(payload.location),
          logo_url: typeof payload.logo_url === "string" ? payload.logo_url : null,
        };

        createdCafes.unshift(createdCafe);

        return HttpResponse.json(
          {
            id: createdCafe.id,
            name: createdCafe.name,
            description: createdCafe.description,
            location: createdCafe.location,
            logo_url: createdCafe.logo_url,
          },
          { status: 201 },
        );
      }),
    );

    const user = userEvent.setup();
    const { router } = renderRoute("/cafes");

    expect(await screen.findByRole("gridcell", { name: "Central Perk" })).toBeInTheDocument();
    expect(cafeListRequestCount).toBe(1);

    await act(async () => {
      await router.navigate("/cafes/new");
    });

    await user.type(await screen.findByRole("textbox", { name: "Name" }), "  New Cafe  ");
    await user.type(screen.getByRole("textbox", { name: "Description" }), "  New branch near the river.  ");
    await user.type(screen.getByRole("textbox", { name: "Location" }), "  River Valley  ");

    await user.click(screen.getByRole("button", { name: "Create Cafe" }));

    await waitFor(() => expect(requestedPayloads).toEqual([
      {
        name: "New Cafe",
        description: "New branch near the river.",
        location: "River Valley",
      },
    ]));
    expect(await screen.findByRole("heading", { name: "Cafes" })).toBeInTheDocument();
    expect(await screen.findByRole("gridcell", { name: "New Cafe" })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/cafes");
    expect(cafeListRequestCount).toBe(2);
  });

  it("allows logo_url to be omitted from the create payload", async () => {
    const requestedPayloads: Array<Record<string, unknown>> = [];

    server.use(
      http.post("http://localhost:8000/cafes", async ({ request }) => {
        requestedPayloads.push((await request.json()) as Record<string, unknown>);

        return HttpResponse.json(
          {
            id: "cafe-no-logo",
            name: "Logo Free Cafe",
            description: "No logo provided.",
            location: "Novena",
            logo_url: null,
          },
          { status: 201 },
        );
      }),
    );

    const user = userEvent.setup();
    renderRoute("/cafes/new");

    await user.type(await screen.findByRole("textbox", { name: "Name" }), "Logo Free Cafe");
    await user.type(screen.getByRole("textbox", { name: "Description" }), "No logo provided.");
    await user.type(screen.getByRole("textbox", { name: "Location" }), "Novena");
    await user.click(screen.getByRole("button", { name: "Create Cafe" }));

    await waitFor(() =>
      expect(requestedPayloads).toEqual([
        {
          name: "Logo Free Cafe",
          description: "No logo provided.",
          location: "Novena",
        },
      ]),
    );
  });

  it("shows a backend create failure without clearing the form", async () => {
    server.use(
      http.post("http://localhost:8000/cafes", () =>
        HttpResponse.json(
          {
            code: "VALIDATION_ERROR",
            message: "Name already exists.",
            details: null,
          },
          { status: 422 },
        ),
      ),
    );

    const user = userEvent.setup();
    renderRoute("/cafes/new");

    await user.type(await screen.findByRole("textbox", { name: "Name" }), "Central Perk");
    await user.type(screen.getByRole("textbox", { name: "Description" }), "Duplicate name.");
    await user.type(screen.getByRole("textbox", { name: "Location" }), "Central Business District");
    await user.click(screen.getByRole("button", { name: "Create Cafe" }));

    expect(await screen.findByText("Unable to create cafe")).toBeInTheDocument();
    expect(screen.getByText("Name already exists.")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("Central Perk");
    expect(screen.getByRole("textbox", { name: "Description" })).toHaveValue("Duplicate name.");
    expect(screen.getByRole("textbox", { name: "Location" })).toHaveValue(
      "Central Business District",
    );
  });

  it("returns to /cafes when cancel is clicked", async () => {
    const user = userEvent.setup();
    renderRoute("/cafes/new");

    await user.click(await screen.findByRole("button", { name: "Cancel" }));

    expect(await screen.findByRole("heading", { name: "Cafes" })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/cafes");
  });

  it("wires dirty-form browser prompts for unload and route transitions", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderRoute("/cafes/new");

    await user.type(await screen.findByRole("textbox", { name: "Name" }), "Dirty Cafe");

    await user.click(screen.getByRole("link", { name: "Employees" }));

    expect(confirmSpy).toHaveBeenCalledWith("You have unsaved changes. Leave this page?");
    expect(await screen.findByRole("heading", { name: "Create Cafe" })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/cafes/new");

    const beforeUnloadEvent = new Event("beforeunload", { cancelable: true });
    Object.defineProperty(beforeUnloadEvent, "returnValue", {
      writable: true,
      value: undefined,
    });

    window.dispatchEvent(beforeUnloadEvent);

    expect(beforeUnloadEvent.defaultPrevented).toBe(true);
    expect((beforeUnloadEvent as Event & { returnValue: unknown }).returnValue).toBe("");

    confirmSpy.mockRestore();
  });

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

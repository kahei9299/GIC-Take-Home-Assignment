import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";

import type { EmployeeListItem } from "@/api/contracts";
import { BackendHealthCard } from "@/routes/shared/BackendHealthCard";
import { renderRoute, renderWithProviders } from "@/test/renderApp";
import {
  defaultCafeDetailFixtures,
  defaultCafeFixtures,
  defaultEmployeeDetailFixtures,
  defaultEmployeeFixtures,
  server,
} from "@/test/server";

async function selectOption(label: string, option: string) {
  const formItem = screen.getByText(label).closest(".ant-form-item");
  const selector = formItem?.querySelector(".ant-select-selector");

  if (!(selector instanceof HTMLElement)) {
    throw new Error(`Unable to find select trigger for ${label}.`);
  }

  fireEvent.mouseDown(selector);
  const listbox = await screen.findByRole("listbox");
  await userEvent.click(within(listbox).getByRole("option", { name: option }));
}

describe("cafe list route", () => {
  it("renders the shell and the cafe list from the backend", async () => {
    renderRoute("/cafes");

    expect(await screen.findByRole("heading", { name: "Cafe Manager" })).toBeInTheDocument();
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
    expect(screen.getByRole("button", { name: "Delete Central Perk" })).toBeInTheDocument();
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

  it("keeps the cafe list stable while a slow backend read is pending", async () => {
    server.use(
      http.get("http://localhost:8000/cafes", async () => {
        await delay(400);
        return HttpResponse.json(defaultCafeFixtures);
      }),
    );

    renderRoute("/cafes");

    expect(screen.getByText("Loading cafes")).toBeInTheDocument();
    expect(await screen.findByRole("gridcell", { name: "Central Perk" })).toBeInTheDocument();
  });

  it("deletes a cafe directly from the list after confirmation", async () => {
    const editableCafes = [...defaultCafeFixtures];
    let cafeListRequestCount = 0;
    let deleteRequestCount = 0;

    server.use(
      http.get("http://localhost:8000/cafes", () => {
        cafeListRequestCount += 1;
        return HttpResponse.json(editableCafes);
      }),
      http.delete("http://localhost:8000/cafes/:id", ({ params }) => {
        deleteRequestCount += 1;
        const cafeIndex = editableCafes.findIndex((entry) => entry.id === String(params.id));
        editableCafes.splice(cafeIndex, 1);
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const user = userEvent.setup();
    renderRoute("/cafes");

    expect(await screen.findByRole("gridcell", { name: "Central Perk" })).toBeInTheDocument();
    expect(cafeListRequestCount).toBe(1);

    await user.click(screen.getByRole("button", { name: "Delete Central Perk" }));

    expect(await screen.findByText(/removes employees who are currently assigned/i)).toBeInTheDocument();

    await user.click(await screen.findAllByRole("button", { name: "Delete Cafe" }).then((buttons) => buttons[0]));

    await waitFor(() => expect(deleteRequestCount).toBe(1));
    expect(screen.queryByRole("gridcell", { name: "Central Perk" })).not.toBeInTheDocument();
    expect(cafeListRequestCount).toBe(2);
  });

  it("shows a list-level delete failure without leaving the cafe page", async () => {
    server.use(
      http.delete("http://localhost:8000/cafes/:id", () =>
        HttpResponse.json(
          {
            code: "CONFLICT",
            message: "Delete is temporarily unavailable.",
            details: null,
          },
          { status: 409 },
        ),
      ),
    );

    const user = userEvent.setup();
    renderRoute("/cafes");

    expect(await screen.findByRole("gridcell", { name: "Central Perk" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete Central Perk" }));
    await user.click(await screen.findAllByRole("button", { name: "Delete Cafe" }).then((buttons) => buttons[0]));

    expect(await screen.findByText("Unable to delete cafe")).toBeInTheDocument();
    expect(screen.getByText("Delete is temporarily unavailable.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Cafes" })).toBeInTheDocument();
  });
});

describe("employee list route", () => {
  it("renders the employee list from the backend", async () => {
    renderRoute("/employees");

    expect(await screen.findByRole("heading", { name: "Employees" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Employee directory" })).toBeInTheDocument();
    expect(
      screen.getByText("Filter the loaded employee rows by cafe name while keeping any backend cafe deep link explicit."),
    ).toBeInTheDocument();
    expect(await screen.findByRole("gridcell", { name: "UI0000010" })).toBeInTheDocument();
    expect(screen.getByRole("gridcell", { name: "Alicia Tan" })).toBeInTheDocument();
    expect(screen.getByRole("gridcell", { name: "alicia.tan@example.com" })).toBeInTheDocument();
    expect(screen.getByRole("gridcell", { name: "91234567" })).toBeInTheDocument();
    expect(screen.getByRole("gridcell", { name: "42" })).toBeInTheDocument();
    expect(screen.getByRole("gridcell", { name: "Central Perk" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Edit Alicia Tan" })).toHaveAttribute(
      "href",
      "/employees/UI0000010/edit",
    );
    expect(screen.getByRole("link", { name: /Add Employee/ })).toHaveAttribute(
      "href",
      "/employees/new",
    );
  });

  it("honors the inbound cafe_id deep link and shows the cafe-name filter context", async () => {
    const requestedCafeIds: string[] = [];

    server.use(
      http.get("http://localhost:8000/employees", ({ request }) => {
        const url = new URL(request.url);
        const cafeId = url.searchParams.get("cafe_id") ?? "";
        requestedCafeIds.push(cafeId);

        const employees = cafeId
          ? defaultEmployeeFixtures.filter((employee) => employee.cafe_id === cafeId)
          : defaultEmployeeFixtures;

        return HttpResponse.json(employees);
      }),
    );

    renderRoute("/employees?cafe_id=cafe-central-1");

    await waitFor(() => expect(requestedCafeIds).toEqual(["cafe-central-1"]));
    expect(await screen.findByText("Showing employees currently assigned to Central Perk.")).toBeInTheDocument();
    expect(screen.getByRole("gridcell", { name: "Alicia Tan" })).toBeInTheDocument();
    expect(screen.queryByRole("gridcell", { name: "Marcus Lim" })).not.toBeInTheDocument();
  });

  it("clears the active employee filter back to /employees", async () => {
    const user = userEvent.setup();
    renderRoute("/employees?cafe_id=cafe-central-1");

    expect(await screen.findByText("Showing employees currently assigned to Central Perk.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear deep link" }));

    expect(await screen.findByRole("gridcell", { name: "Marcus Lim" })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/employees");
    expect(window.location.search).toBe("");
  });

  it("filters the loaded employee rows by cafe name locally", async () => {
    const user = userEvent.setup();
    renderRoute("/employees");

    expect(await screen.findByRole("gridcell", { name: "Alicia Tan" })).toBeInTheDocument();
    expect(screen.getByRole("gridcell", { name: "Marcus Lim" })).toBeInTheDocument();

    await user.type(screen.getByRole("textbox", { name: "Cafe name filter" }), "harbour");
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(await screen.findByRole("gridcell", { name: "Marcus Lim" })).toBeInTheDocument();
    expect(screen.queryByRole("gridcell", { name: "Alicia Tan" })).not.toBeInTheDocument();
    expect(screen.queryByRole("gridcell", { name: "Nadia Wong" })).not.toBeInTheDocument();
  });

  it("clears the local cafe-name filter and restores the loaded employee rows", async () => {
    const user = userEvent.setup();
    renderRoute("/employees");

    expect(await screen.findByRole("gridcell", { name: "Alicia Tan" })).toBeInTheDocument();

    await user.type(screen.getByRole("textbox", { name: "Cafe name filter" }), "central");
    await user.click(screen.getByRole("button", { name: "Apply" }));
    expect(await screen.findByRole("gridcell", { name: "Alicia Tan" })).toBeInTheDocument();
    expect(screen.queryByRole("gridcell", { name: "Marcus Lim" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear" }));

    expect(await screen.findByRole("gridcell", { name: "Marcus Lim" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Cafe name filter" })).toHaveValue("");
  });

  it("degrades safely when the cafe-name lookup fails but the employee list still loads", async () => {
    server.use(
      http.get("http://localhost:8000/cafes/:id", () =>
        HttpResponse.json(
          {
            code: "RESOURCE_NOT_FOUND",
            message: "Cafe not found.",
            details: null,
          },
          { status: 404 },
        ),
      ),
    );

    renderRoute("/employees?cafe_id=cafe-central-1");

    expect(await screen.findByText("Showing employees filtered by cafe.")).toBeInTheDocument();
    expect(await screen.findByRole("gridcell", { name: "Alicia Tan" })).toBeInTheDocument();
  });

  it("renders unassigned employees explicitly", async () => {
    renderRoute("/employees");

    expect(await screen.findByRole("gridcell", { name: "Nadia Wong" })).toBeInTheDocument();
    expect(screen.getByText("Unassigned")).toBeInTheDocument();
  });

  it("shows a retryable employee-list error state and recovers on retry", async () => {
    let requestCount = 0;

    server.use(
      http.get("http://localhost:8000/employees", () => {
        requestCount += 1;

        if (requestCount <= 3) {
          return HttpResponse.error();
        }

        return HttpResponse.json(defaultEmployeeFixtures);
      }),
    );

    const user = userEvent.setup();
    renderRoute("/employees");

    expect(await screen.findByText("Unable to load employees")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Retry request" }));

    expect(await screen.findByRole("gridcell", { name: "Alicia Tan" })).toBeInTheDocument();
  });

  it("shows an unfiltered empty state with an Add Employee CTA", async () => {
    server.use(
      http.get("http://localhost:8000/employees", () => HttpResponse.json([])),
    );

    renderRoute("/employees");

    expect(await screen.findByText("No employees to display")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Add Employee/ })).toHaveLength(2);
  });

  it("shows a filtered empty state with a clear-filter action", async () => {
    server.use(
      http.get("http://localhost:8000/employees", ({ request }) => {
        const url = new URL(request.url);
        const cafeId = url.searchParams.get("cafe_id");

        if (cafeId === "cafe-central-2") {
          return HttpResponse.json([]);
        }

        return HttpResponse.json(defaultEmployeeFixtures);
      }),
    );

    renderRoute("/employees?cafe_id=cafe-central-2");

    expect(await screen.findByText("No employees matched this cafe")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Clear deep link" })).toHaveLength(2);
  });

  it("shows a cafe-name-filter empty state with a clear action", async () => {
    const user = userEvent.setup();
    renderRoute("/employees");

    expect(await screen.findByRole("gridcell", { name: "Alicia Tan" })).toBeInTheDocument();

    await user.type(screen.getByRole("textbox", { name: "Cafe name filter" }), "orchard");
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(await screen.findByText("No employees matched this cafe name")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Clear" })).toHaveLength(2);
  });

  it("deletes an employee directly from the list after confirmation", async () => {
    const employees: EmployeeListItem[] = defaultEmployeeFixtures.map((employee) => ({
      ...employee,
      gender: employee.gender as EmployeeListItem["gender"],
    }));
    let employeeListRequestCount = 0;
    let deleteRequestCount = 0;

    server.use(
      http.get("http://localhost:8000/employees", () => {
        employeeListRequestCount += 1;
        return HttpResponse.json(employees);
      }),
      http.delete("http://localhost:8000/employees/:id", ({ params }) => {
        deleteRequestCount += 1;
        const employeeIndex = employees.findIndex((entry) => entry.id === String(params.id));
        employees.splice(employeeIndex, 1);
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const user = userEvent.setup();
    renderRoute("/employees");

    expect(await screen.findByRole("gridcell", { name: "Alicia Tan" })).toBeInTheDocument();
    expect(employeeListRequestCount).toBe(1);

    await user.click(screen.getByRole("button", { name: "Delete Alicia Tan" }));

    expect(await screen.findByText(/removes their assignment history/i)).toBeInTheDocument();

    await user.click(
      await screen.findAllByRole("button", { name: "Delete Employee" }).then((buttons) => buttons[0]),
    );

    await waitFor(() => expect(deleteRequestCount).toBe(1));
    await waitFor(() =>
      expect(screen.queryByRole("gridcell", { name: "Alicia Tan" })).not.toBeInTheDocument(),
    );
    expect(employeeListRequestCount).toBe(2);
    expect(window.location.pathname).toBe("/employees");
  });

  it("shows a list-level delete failure without leaving the employee page", async () => {
    server.use(
      http.delete("http://localhost:8000/employees/:id", () =>
        HttpResponse.json(
          {
            code: "CONFLICT",
            message: "Delete is temporarily unavailable.",
            details: null,
          },
          { status: 409 },
        ),
      ),
    );

    const user = userEvent.setup();
    renderRoute("/employees");

    expect(await screen.findByRole("gridcell", { name: "Alicia Tan" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete Alicia Tan" }));
    await user.click(
      await screen.findAllByRole("button", { name: "Delete Employee" }).then((buttons) => buttons[0]),
    );

    expect(await screen.findByText("Unable to delete employee")).toBeInTheDocument();
    expect(screen.getByText("Delete is temporarily unavailable.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Employees" })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/employees");
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

  it("loads cafe detail on direct navigation and prefills the edit form", async () => {
    renderRoute("/cafes/cafe-central-1/edit");

    expect(await screen.findByRole("heading", { name: "Edit Cafe" })).toBeInTheDocument();
    expect(await screen.findByDisplayValue(defaultCafeDetailFixtures["cafe-central-1"].name)).toBeInTheDocument();
    expect(
      screen.getByDisplayValue(defaultCafeDetailFixtures["cafe-central-1"].description),
    ).toBeInTheDocument();
    expect(
      screen.getByDisplayValue(defaultCafeDetailFixtures["cafe-central-1"].location),
    ).toBeInTheDocument();
    expect(
      screen.getByDisplayValue(defaultCafeDetailFixtures["cafe-central-1"].logo_url ?? ""),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete Cafe" })).toBeInTheDocument();
  });

  it("keeps direct edit navigation stable while the detail read is slow", async () => {
    server.use(
      http.get("http://localhost:8000/cafes/:id", async ({ params }) => {
        await delay(300);
        return HttpResponse.json(defaultCafeDetailFixtures[String(params.id)]);
      }),
    );

    renderRoute("/cafes/cafe-central-1/edit");

    expect(screen.getByText("Loading cafe details")).toBeInTheDocument();
    expect(await screen.findByDisplayValue("Central Perk")).toBeInTheDocument();
    expect(window.location.pathname).toBe("/cafes/cafe-central-1/edit");
  });

  it("updates a cafe, trims the payload, invalidates queries, and returns to /cafes", async () => {
    const editableCafes = [...defaultCafeFixtures];
    const requestedPayloads: Array<Record<string, unknown>> = [];
    let cafeListRequestCount = 0;

    server.use(
      http.get("http://localhost:8000/cafes", () => {
        cafeListRequestCount += 1;
        return HttpResponse.json(editableCafes);
      }),
      http.get("http://localhost:8000/cafes/:id", ({ params }) => {
        const cafe = editableCafes.find((entry) => entry.id === String(params.id));

        if (!cafe) {
          return HttpResponse.json(
            {
              code: "RESOURCE_NOT_FOUND",
              message: "Cafe not found.",
              details: null,
            },
            { status: 404 },
          );
        }

        return HttpResponse.json({
          name: cafe.name,
          description: cafe.description,
          logo_url: cafe.logo_url,
          location: cafe.location,
        });
      }),
      http.put("http://localhost:8000/cafes/:id", async ({ params, request }) => {
        const payload = (await request.json()) as Record<string, unknown>;
        requestedPayloads.push(payload);

        const cafeIndex = editableCafes.findIndex((entry) => entry.id === String(params.id));
        editableCafes[cafeIndex] = {
          ...editableCafes[cafeIndex],
          name: String(payload.name),
          description: String(payload.description),
          location: String(payload.location),
          logo_url: typeof payload.logo_url === "string" ? payload.logo_url : null,
        };

        return HttpResponse.json({
          id: editableCafes[cafeIndex].id,
          name: editableCafes[cafeIndex].name,
          description: editableCafes[cafeIndex].description,
          location: editableCafes[cafeIndex].location,
          logo_url: editableCafes[cafeIndex].logo_url,
        });
      }),
    );

    const user = userEvent.setup();
    const { router } = renderRoute("/cafes");

    expect(await screen.findByRole("gridcell", { name: "Central Perk" })).toBeInTheDocument();
    expect(cafeListRequestCount).toBe(1);

    await act(async () => {
      await router.navigate("/cafes/cafe-central-1/edit");
    });

    const nameInput = await screen.findByRole("textbox", { name: "Name" });
    await user.clear(nameInput);
    await user.type(nameInput, "  Central Perk Revamp  ");
    await user.clear(screen.getByRole("textbox", { name: "Description" }));
    await user.type(screen.getByRole("textbox", { name: "Description" }), "  Refreshed flagship concept.  ");
    await user.clear(screen.getByRole("textbox", { name: "Location" }));
    await user.type(screen.getByRole("textbox", { name: "Location" }), "  Marina Bay  ");
    await user.clear(screen.getByRole("textbox", { name: "Logo URL" }));

    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() =>
      expect(requestedPayloads).toEqual([
        {
          name: "Central Perk Revamp",
          description: "Refreshed flagship concept.",
          location: "Marina Bay",
        },
      ]),
    );
    expect(await screen.findByRole("heading", { name: "Cafes" })).toBeInTheDocument();
    expect(await screen.findByRole("gridcell", { name: "Central Perk Revamp" })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/cafes");
    expect(cafeListRequestCount).toBe(2);
  });

  it("shows a retryable read failure for the edit page and recovers on retry", async () => {
    let requestCount = 0;

    server.use(
      http.get("http://localhost:8000/cafes/:id", ({ params }) => {
        requestCount += 1;

        if (requestCount <= 3) {
          return HttpResponse.error();
        }

        return HttpResponse.json(defaultCafeDetailFixtures[String(params.id)]);
      }),
    );

    const user = userEvent.setup();
    renderRoute("/cafes/cafe-central-1/edit");

    expect(await screen.findByText("Unable to load cafe details")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Retry request" }));

    expect(await screen.findByDisplayValue("Central Perk")).toBeInTheDocument();
  });

  it("shows a clear not-found state when the cafe detail returns 404", async () => {
    server.use(
      http.get("http://localhost:8000/cafes/:id", () =>
        HttpResponse.json(
          {
            code: "RESOURCE_NOT_FOUND",
            message: "Cafe not found.",
            details: null,
          },
          { status: 404 },
        ),
      ),
    );

    renderRoute("/cafes/cafe-missing/edit");

    expect(await screen.findByText("Cafe not found")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Name" })).not.toBeInTheDocument();
  });

  it("shows an update failure without clearing the edit form", async () => {
    server.use(
      http.put("http://localhost:8000/cafes/:id", () =>
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
    renderRoute("/cafes/cafe-central-1/edit");

    const nameInput = await screen.findByRole("textbox", { name: "Name" });
    await user.clear(nameInput);
    await user.type(nameInput, "Central Perk Updated");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(await screen.findByText("Unable to update cafe")).toBeInTheDocument();
    expect(screen.getByText("Name already exists.")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("Central Perk Updated");
  });

  it("deletes a cafe after confirmation, invalidates queries, and returns to /cafes", async () => {
    const editableCafes = [...defaultCafeFixtures];
    let cafeListRequestCount = 0;
    let deleteRequestCount = 0;

    server.use(
      http.get("http://localhost:8000/cafes", () => {
        cafeListRequestCount += 1;
        return HttpResponse.json(editableCafes);
      }),
      http.get("http://localhost:8000/cafes/:id", ({ params }) => {
        const cafe = editableCafes.find((entry) => entry.id === String(params.id));

        if (!cafe) {
          return HttpResponse.json(
            {
              code: "RESOURCE_NOT_FOUND",
              message: "Cafe not found.",
              details: null,
            },
            { status: 404 },
          );
        }

        return HttpResponse.json({
          name: cafe.name,
          description: cafe.description,
          logo_url: cafe.logo_url,
          location: cafe.location,
        });
      }),
      http.delete("http://localhost:8000/cafes/:id", ({ params }) => {
        deleteRequestCount += 1;
        const cafeIndex = editableCafes.findIndex((entry) => entry.id === String(params.id));
        editableCafes.splice(cafeIndex, 1);
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const user = userEvent.setup();
    const { router } = renderRoute("/cafes");

    expect(await screen.findByRole("gridcell", { name: "Central Perk" })).toBeInTheDocument();
    expect(cafeListRequestCount).toBe(1);

    await act(async () => {
      await router.navigate("/cafes/cafe-central-1/edit");
    });

    await user.click(await screen.findByRole("button", { name: "Delete Cafe" }));

    expect(await screen.findByText(/removes employees who are currently assigned/i)).toBeInTheDocument();

    await user.click(await screen.findAllByRole("button", { name: "Delete Cafe" }).then((buttons) => buttons[1]));

    await waitFor(() => expect(deleteRequestCount).toBe(1));
    expect(await screen.findByRole("heading", { name: "Cafes" })).toBeInTheDocument();
    await waitFor(() => expect(cafeListRequestCount).toBe(2));
    await waitFor(() =>
      expect(screen.queryByRole("gridcell", { name: "Central Perk" })).not.toBeInTheDocument(),
    );
    expect(window.location.pathname).toBe("/cafes");
  });

  it("shows a delete failure and keeps the user on the edit page", async () => {
    server.use(
      http.delete("http://localhost:8000/cafes/:id", () =>
        HttpResponse.json(
          {
            code: "CONFLICT",
            message: "Delete is temporarily unavailable.",
            details: null,
          },
          { status: 409 },
        ),
      ),
    );

    const user = userEvent.setup();
    renderRoute("/cafes/cafe-central-1/edit");

    await user.click(await screen.findByRole("button", { name: "Delete Cafe" }));
    await user.click(await screen.findAllByRole("button", { name: "Delete Cafe" }).then((buttons) => buttons[1]));

    expect(await screen.findByText("Unable to delete cafe")).toBeInTheDocument();
    expect(screen.getByText("Delete is temporarily unavailable.")).toBeInTheDocument();
    expect(window.location.pathname).toBe("/cafes/cafe-central-1/edit");
  });

  it("wires dirty-form prompts on the edit page for unload and route transitions", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderRoute("/cafes/cafe-central-1/edit");

    await user.type(await screen.findByRole("textbox", { name: "Name" }), " Updated");

    await user.click(screen.getByRole("link", { name: "Employees" }));

    expect(confirmSpy).toHaveBeenCalledWith("You have unsaved changes. Leave this page?");
    expect(await screen.findByRole("heading", { name: "Edit Cafe" })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/cafes/cafe-central-1/edit");

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

  it("renders the employee create form fields and assignment options", async () => {
    renderRoute("/employees/new");

    expect(await screen.findByRole("heading", { name: "Create Employee" })).toBeInTheDocument();
    expect(await screen.findByRole("textbox", { name: "Name" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Email" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Phone Number" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Gender" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Assigned Cafe" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Employee" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("blocks empty employee submission with required validation", async () => {
    const user = userEvent.setup();
    renderRoute("/employees/new");

    await user.click(await screen.findByRole("button", { name: "Create Employee" }));

    expect(await screen.findByText("Enter an employee name.")).toBeInTheDocument();
    expect(screen.getByText("Enter an email address.")).toBeInTheDocument();
    expect(screen.getByText("Enter a phone number.")).toBeInTheDocument();
    expect(screen.getByText("Select a gender.")).toBeInTheDocument();
    expect(screen.getByText("Select a cafe assignment.")).toBeInTheDocument();
  });

  it("creates an employee, trims the payload, invalidates queries, and returns to /employees", async () => {
    const employees: EmployeeListItem[] = defaultEmployeeFixtures.map((employee) => ({
      ...employee,
      gender: employee.gender as EmployeeListItem["gender"],
    }));
    const requestedPayloads: Array<Record<string, unknown>> = [];
    let employeeListRequestCount = 0;
    let cafeListRequestCount = 0;

    server.use(
      http.get("http://localhost:8000/employees", () => {
        employeeListRequestCount += 1;
        return HttpResponse.json(employees);
      }),
      http.get("http://localhost:8000/cafes", () => {
        cafeListRequestCount += 1;
        return HttpResponse.json(defaultCafeFixtures);
      }),
      http.post("http://localhost:8000/employees", async ({ request }) => {
        const payload = (await request.json()) as Record<string, unknown>;
        requestedPayloads.push(payload);

        const matchedCafe = defaultCafeFixtures.find((cafe) => cafe.id === payload.cafe_id);
        const createdEmployee = {
          id: "UI0000099",
          name: String(payload.name),
          email_address: String(payload.email_address),
          phone_number: String(payload.phone_number),
          gender: String(payload.gender) as EmployeeListItem["gender"],
          days_worked: 0,
          cafe: matchedCafe?.name ?? null,
          cafe_id: typeof payload.cafe_id === "string" ? payload.cafe_id : null,
        };

        employees.unshift(createdEmployee);

        return HttpResponse.json(createdEmployee, { status: 201 });
      }),
    );

    const user = userEvent.setup();
    const { router } = renderRoute("/employees");

    expect(await screen.findByRole("gridcell", { name: "Alicia Tan" })).toBeInTheDocument();
    expect(employeeListRequestCount).toBe(1);

    await act(async () => {
      await router.navigate("/employees/new");
    });

    await user.type(await screen.findByRole("textbox", { name: "Name" }), "  Yvonne Tan  ");
    await user.type(screen.getByRole("textbox", { name: "Email" }), "  yvonne.tan@example.com  ");
    await user.type(screen.getByRole("textbox", { name: "Phone Number" }), " 81239999 ");
    await selectOption("Gender", "Female");
    await selectOption("Assigned Cafe", "Central Perk");

    await user.click(screen.getByRole("button", { name: "Create Employee" }));

    await waitFor(() =>
      expect(requestedPayloads).toEqual([
        {
          name: "Yvonne Tan",
          email_address: "yvonne.tan@example.com",
          phone_number: "81239999",
          gender: "Female",
          cafe_id: "cafe-central-1",
        },
      ]),
    );
    expect(await screen.findByRole("heading", { name: "Employees" })).toBeInTheDocument();
    expect(await screen.findByRole("gridcell", { name: "Yvonne Tan" })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/employees");
    expect(employeeListRequestCount).toBe(2);
    expect(cafeListRequestCount).toBe(2);
  });

  it("shows a backend employee-create failure without clearing the form", async () => {
    server.use(
      http.post("http://localhost:8000/employees", () =>
        HttpResponse.json(
          {
            code: "CONFLICT",
            message: "Employee email address or phone number already exists.",
            details: null,
          },
          { status: 409 },
        ),
      ),
    );

    const user = userEvent.setup();
    renderRoute("/employees/new");

    await user.type(await screen.findByRole("textbox", { name: "Name" }), "Yvonne Tan");
    await user.type(screen.getByRole("textbox", { name: "Email" }), "yvonne.tan@example.com");
    await user.type(screen.getByRole("textbox", { name: "Phone Number" }), "81239999");
    await selectOption("Gender", "Female");
    await selectOption("Assigned Cafe", "Central Perk");
    await user.click(screen.getByRole("button", { name: "Create Employee" }));

    expect(await screen.findByText("Unable to create employee")).toBeInTheDocument();
    expect(screen.getByText("Employee email address or phone number already exists.")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("Yvonne Tan");
    expect(screen.getByRole("textbox", { name: "Email" })).toHaveValue("yvonne.tan@example.com");
    expect(screen.getByRole("textbox", { name: "Phone Number" })).toHaveValue("81239999");
  });

  it("returns to /employees when employee create cancel is clicked on a clean form", async () => {
    const user = userEvent.setup();
    renderRoute("/employees/new");

    await user.click(await screen.findByRole("button", { name: "Cancel" }));

    expect(await screen.findByRole("heading", { name: "Employees" })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/employees");
  });

  it("warns before leaving a dirty employee create form", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderRoute("/employees/new");

    await user.type(await screen.findByRole("textbox", { name: "Name" }), "Dirty Employee");

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(confirmSpy).toHaveBeenCalledWith("You have unsaved changes. Leave this page?");
    expect(await screen.findByRole("heading", { name: "Create Employee" })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/employees/new");

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

  it("shows a retryable cafe-options error state and recovers on retry", async () => {
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
    renderRoute("/employees/new");

    expect(await screen.findByText("Unable to load cafes")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Retry request" }));

    expect(await screen.findByRole("combobox", { name: "Assigned Cafe" })).toBeInTheDocument();
  });

  it("loads employee detail on direct navigation and prefills the edit form", async () => {
    renderRoute("/employees/UI0000010/edit");

    expect(await screen.findByRole("heading", { name: "Edit Employee" })).toBeInTheDocument();
    expect(await screen.findByDisplayValue(defaultEmployeeDetailFixtures["UI0000010"].name)).toBeInTheDocument();
    expect(
      screen.getByDisplayValue(defaultEmployeeDetailFixtures["UI0000010"].email_address),
    ).toBeInTheDocument();
    expect(
      screen.getByDisplayValue(defaultEmployeeDetailFixtures["UI0000010"].phone_number),
    ).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Gender" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Assigned Cafe" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete Employee" })).toBeInTheDocument();
  });

  it("keeps direct employee edit navigation stable while required reads are slow", async () => {
    server.use(
      http.get("http://localhost:8000/employees/:id", async ({ params }) => {
        await delay(300);
        return HttpResponse.json(defaultEmployeeDetailFixtures[String(params.id)]);
      }),
      http.get("http://localhost:8000/cafes", async () => {
        await delay(300);
        return HttpResponse.json(defaultCafeFixtures);
      }),
    );

    renderRoute("/employees/UI0000010/edit");

    expect(screen.getByText("Loading employee details")).toBeInTheDocument();
    expect(await screen.findByDisplayValue("Alicia Tan")).toBeInTheDocument();
    expect(window.location.pathname).toBe("/employees/UI0000010/edit");
  });

  it("updates an employee, trims the payload, invalidates queries, and returns to /employees", async () => {
    const employees: EmployeeListItem[] = defaultEmployeeFixtures.map((employee) => ({
      ...employee,
      gender: employee.gender as EmployeeListItem["gender"],
    }));
    const employeeDetails = structuredClone(defaultEmployeeDetailFixtures);
    const requestedPayloads: Array<Record<string, unknown>> = [];
    let employeeListRequestCount = 0;
    let cafeListRequestCount = 0;

    server.use(
      http.get("http://localhost:8000/employees", () => {
        employeeListRequestCount += 1;
        return HttpResponse.json(employees);
      }),
      http.get("http://localhost:8000/employees/:id", ({ params }) => {
        const employee = employeeDetails[String(params.id)];

        if (!employee) {
          return HttpResponse.json(
            {
              code: "RESOURCE_NOT_FOUND",
              message: "Employee not found.",
              details: null,
            },
            { status: 404 },
          );
        }

        return HttpResponse.json(employee);
      }),
      http.get("http://localhost:8000/cafes", () => {
        cafeListRequestCount += 1;
        return HttpResponse.json(defaultCafeFixtures);
      }),
      http.put("http://localhost:8000/employees/:id", async ({ params, request }) => {
        const payload = (await request.json()) as Record<string, unknown>;
        requestedPayloads.push(payload);

        const employeeIndex = employees.findIndex((entry) => entry.id === String(params.id));
        const matchedCafe = defaultCafeFixtures.find((cafe) => cafe.id === payload.cafe_id);

        employees[employeeIndex] = {
          ...employees[employeeIndex],
          name: String(payload.name),
          email_address: String(payload.email_address),
          phone_number: String(payload.phone_number),
          gender: String(payload.gender) as EmployeeListItem["gender"],
          cafe: matchedCafe?.name ?? null,
          cafe_id: typeof payload.cafe_id === "string" ? payload.cafe_id : null,
          days_worked: employees[employeeIndex].days_worked,
        };

        employeeDetails[String(params.id)] = {
          name: employees[employeeIndex].name,
          email_address: employees[employeeIndex].email_address,
          phone_number: employees[employeeIndex].phone_number,
          gender: employees[employeeIndex].gender,
          cafe: employees[employeeIndex].cafe,
          cafe_id: employees[employeeIndex].cafe_id,
        };

        return HttpResponse.json(employees[employeeIndex]);
      }),
    );

    const user = userEvent.setup();
    const { router } = renderRoute("/employees");

    expect(await screen.findByRole("gridcell", { name: "Alicia Tan" })).toBeInTheDocument();
    expect(employeeListRequestCount).toBe(1);

    await act(async () => {
      await router.navigate("/employees/UI0000010/edit");
    });

    const nameInput = await screen.findByRole("textbox", { name: "Name" });
    await user.clear(nameInput);
    await user.type(nameInput, "  Alicia Tan Updated  ");
    await user.clear(screen.getByRole("textbox", { name: "Email" }));
    await user.type(screen.getByRole("textbox", { name: "Email" }), "  alicia.updated@example.com  ");
    await user.clear(screen.getByRole("textbox", { name: "Phone Number" }));
    await user.type(screen.getByRole("textbox", { name: "Phone Number" }), " 82345678 ");
    await selectOption("Assigned Cafe", "Harbour Grounds");

    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() =>
      expect(requestedPayloads).toEqual([
        {
          name: "Alicia Tan Updated",
          email_address: "alicia.updated@example.com",
          phone_number: "82345678",
          gender: "Female",
          cafe_id: "cafe-west-1",
        },
      ]),
    );
    expect(await screen.findByRole("heading", { name: "Employees" })).toBeInTheDocument();
    expect(await screen.findByRole("gridcell", { name: "Alicia Tan Updated" })).toBeInTheDocument();
    expect(screen.getAllByRole("gridcell", { name: "Harbour Grounds" }).length).toBeGreaterThan(0);
    expect(window.location.pathname).toBe("/employees");
    expect(employeeListRequestCount).toBe(2);
    expect(cafeListRequestCount).toBe(2);
  });

  it("supports unassigning an employee from the edit form", async () => {
    const requestedPayloads: Array<Record<string, unknown>> = [];

    server.use(
      http.put("http://localhost:8000/employees/:id", async ({ request }) => {
        requestedPayloads.push((await request.json()) as Record<string, unknown>);

        return HttpResponse.json({
          id: "UI0000010",
          name: "Alicia Tan",
          email_address: "alicia.tan@example.com",
          phone_number: "91234567",
          gender: "Female",
          days_worked: 0,
          cafe: null,
          cafe_id: null,
        });
      }),
    );

    const user = userEvent.setup();
    renderRoute("/employees/UI0000010/edit");

    await screen.findByRole("textbox", { name: "Name" });
    await selectOption("Assigned Cafe", "Unassigned");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() =>
      expect(requestedPayloads).toEqual([
        {
          name: "Alicia Tan",
          email_address: "alicia.tan@example.com",
          phone_number: "91234567",
          gender: "Female",
          cafe_id: null,
        },
      ]),
    );
  });

  it("returns to /employees when employee edit cancel is clicked on a clean form", async () => {
    const user = userEvent.setup();
    renderRoute("/employees/UI0000010/edit");

    await user.click(await screen.findByRole("button", { name: "Cancel" }));

    expect(await screen.findByRole("heading", { name: "Employees" })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/employees");
  });

  it("shows a retryable read failure for the employee edit page and recovers on retry", async () => {
    let employeeRequestCount = 0;

    server.use(
      http.get("http://localhost:8000/employees/:id", ({ params }) => {
        employeeRequestCount += 1;

        if (employeeRequestCount <= 3) {
          return HttpResponse.error();
        }

        return HttpResponse.json(defaultEmployeeDetailFixtures[String(params.id)]);
      }),
    );

    const user = userEvent.setup();
    renderRoute("/employees/UI0000010/edit");

    expect(await screen.findByText("Unable to load employee details")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Retry request" }));

    expect(await screen.findByDisplayValue("Alicia Tan")).toBeInTheDocument();
  });

  it("shows a clear not-found state when the employee detail returns 404", async () => {
    server.use(
      http.get("http://localhost:8000/employees/:id", () =>
        HttpResponse.json(
          {
            code: "RESOURCE_NOT_FOUND",
            message: "Employee not found.",
            details: null,
          },
          { status: 404 },
        ),
      ),
    );

    renderRoute("/employees/UI0000999/edit");

    expect(await screen.findByText("Employee not found")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Name" })).not.toBeInTheDocument();
  });

  it("shows an employee update failure without clearing the edit form", async () => {
    server.use(
      http.put("http://localhost:8000/employees/:id", () =>
        HttpResponse.json(
          {
            code: "CONFLICT",
            message: "Employee email address or phone number already exists.",
            details: null,
          },
          { status: 409 },
        ),
      ),
    );

    const user = userEvent.setup();
    renderRoute("/employees/UI0000010/edit");

    const nameInput = await screen.findByRole("textbox", { name: "Name" });
    await user.clear(nameInput);
    await user.type(nameInput, "Alicia Tan Updated");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(await screen.findByText("Unable to update employee")).toBeInTheDocument();
    expect(screen.getByText("Employee email address or phone number already exists.")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("Alicia Tan Updated");
  });

  it("deletes an employee after confirmation, invalidates queries, and returns to /employees", async () => {
    const employees: EmployeeListItem[] = defaultEmployeeFixtures.map((employee) => ({
      ...employee,
      gender: employee.gender as EmployeeListItem["gender"],
    }));
    let employeeListRequestCount = 0;
    let deleteRequestCount = 0;

    server.use(
      http.get("http://localhost:8000/employees", () => {
        employeeListRequestCount += 1;
        return HttpResponse.json(employees);
      }),
      http.delete("http://localhost:8000/employees/:id", ({ params }) => {
        deleteRequestCount += 1;
        const employeeIndex = employees.findIndex((entry) => entry.id === String(params.id));
        employees.splice(employeeIndex, 1);
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const user = userEvent.setup();
    const { router } = renderRoute("/employees");

    expect(await screen.findByRole("gridcell", { name: "Alicia Tan" })).toBeInTheDocument();
    expect(employeeListRequestCount).toBe(1);

    await act(async () => {
      await router.navigate("/employees/UI0000010/edit");
    });

    await user.click(await screen.findByRole("button", { name: "Delete Employee" }));
    await user.click(
      await screen.findAllByRole("button", { name: "Delete Employee" }).then((buttons) => buttons[1]),
    );

    await waitFor(() => expect(deleteRequestCount).toBe(1));
    expect(await screen.findByRole("heading", { name: "Employees" })).toBeInTheDocument();
    await waitFor(() => expect(employeeListRequestCount).toBe(2));
    await waitFor(() =>
      expect(screen.queryByRole("gridcell", { name: "Alicia Tan" })).not.toBeInTheDocument(),
    );
    expect(window.location.pathname).toBe("/employees");
  });

  it("shows an employee delete failure and keeps the user on the edit page", async () => {
    server.use(
      http.delete("http://localhost:8000/employees/:id", () =>
        HttpResponse.json(
          {
            code: "CONFLICT",
            message: "Delete is temporarily unavailable.",
            details: null,
          },
          { status: 409 },
        ),
      ),
    );

    const user = userEvent.setup();
    renderRoute("/employees/UI0000010/edit");

    await user.click(await screen.findByRole("button", { name: "Delete Employee" }));
    await user.click(
      await screen.findAllByRole("button", { name: "Delete Employee" }).then((buttons) => buttons[1]),
    );

    expect(await screen.findByText("Unable to delete employee")).toBeInTheDocument();
    expect(screen.getByText("Delete is temporarily unavailable.")).toBeInTheDocument();
    expect(window.location.pathname).toBe("/employees/UI0000010/edit");
  });

  it("wires dirty-form prompts on the employee edit page for unload and route transitions", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderRoute("/employees/UI0000010/edit");

    await user.type(await screen.findByRole("textbox", { name: "Name" }), " Updated");

    await user.click(screen.getByRole("link", { name: "Cafes" }));

    expect(confirmSpy).toHaveBeenCalledWith("You have unsaved changes. Leave this page?");
    expect(await screen.findByRole("heading", { name: "Edit Employee" })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/employees/UI0000010/edit");

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

  it("supports staging-style absolute backend URLs through VITE_API_BASE_URL", async () => {
    server.use(
      http.get("https://staging-backend.example.com/health", () =>
        HttpResponse.json({ status: "ok" }),
      ),
    );

    vi.resetModules();
    vi.stubEnv("VITE_API_BASE_URL", "https://staging-backend.example.com");

    const { getHealth: stagedGetHealth } = await import("@/api/client");

    await expect(stagedGetHealth()).resolves.toEqual({ status: "ok" });
  });
});

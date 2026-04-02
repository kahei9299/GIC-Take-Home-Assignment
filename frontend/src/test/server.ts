import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

const defaultApiBaseUrl = "http://localhost:8000";

export const defaultCafeFixtures = [
  {
    id: "cafe-central-1",
    name: "Central Perk",
    description: "Flagship cafe in the financial district.",
    logo_url: "https://placehold.co/320x192/f3eadf/7a4b2f/png?text=Central+Perk%0AFlagship&font=playfair-display",
    location: "Central Business District",
    employees: 8,
  },
  {
    id: "cafe-central-2",
    name: "Tanjong Brew",
    description: "Coffee bar near the downtown office cluster.",
    logo_url: null,
    location: "Central Business District",
    employees: 0,
  },
  {
    id: "cafe-west-1",
    name: "Harbour Grounds",
    description: "Waterfront branch with all-day service.",
    logo_url: "https://placehold.co/320x192/e4f1f1/2f6f73/png?text=Harbour%0AGrounds&font=playfair-display",
    location: "Harbourfront",
    employees: 3,
  },
];

export const defaultCafeDetailFixtures = Object.fromEntries(
  defaultCafeFixtures.map((cafe) => [
    cafe.id,
    {
      name: cafe.name,
      description: cafe.description,
      logo_url: cafe.logo_url,
      location: cafe.location,
    },
  ]),
);

export const defaultEmployeeFixtures = [
  {
    id: "UI0000010",
    name: "Alicia Tan",
    email_address: "alicia.tan@example.com",
    phone_number: "91234567",
    gender: "Female",
    days_worked: 42,
    cafe: "Central Perk",
    cafe_id: "cafe-central-1",
  },
  {
    id: "UI0000011",
    name: "Marcus Lim",
    email_address: "marcus.lim@example.com",
    phone_number: "92345678",
    gender: "Male",
    days_worked: 18,
    cafe: "Harbour Grounds",
    cafe_id: "cafe-west-1",
  },
  {
    id: "UI0000012",
    name: "Nadia Wong",
    email_address: "nadia.wong@example.com",
    phone_number: "93456789",
    gender: "Female",
    days_worked: 0,
    cafe: null,
    cafe_id: null,
  },
];

export const defaultEmployeeDetailFixtures = Object.fromEntries(
  defaultEmployeeFixtures.map((employee) => [
    employee.id,
    {
      name: employee.name,
      email_address: employee.email_address,
      phone_number: employee.phone_number,
      gender: employee.gender,
      cafe: employee.cafe,
      cafe_id: employee.cafe_id,
    },
  ]),
);

function normalizeLocation(value: string | null) {
  return value?.trim().toLocaleLowerCase() ?? "";
}

export const server = setupServer(
  http.get(`${defaultApiBaseUrl}/health`, () => HttpResponse.json({ status: "ok" })),
  http.get(`${defaultApiBaseUrl}/cafes`, ({ request }) => {
    const url = new URL(request.url);
    const requestedLocation = normalizeLocation(url.searchParams.get("location"));
    const cafes = requestedLocation
      ? defaultCafeFixtures.filter((cafe) => normalizeLocation(cafe.location) === requestedLocation)
      : defaultCafeFixtures;

    return HttpResponse.json(cafes);
  }),
  http.get(`${defaultApiBaseUrl}/cafes/:id`, ({ params }) => {
    const cafe = defaultCafeDetailFixtures[String(params.id)];

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

    return HttpResponse.json(cafe);
  }),
  http.get(`${defaultApiBaseUrl}/employees`, ({ request }) => {
    const url = new URL(request.url);
    const requestedCafeId = url.searchParams.get("cafe_id");

    const employees = requestedCafeId
      ? defaultEmployeeFixtures.filter((employee) => employee.cafe_id === requestedCafeId)
      : defaultEmployeeFixtures;

    return HttpResponse.json(employees);
  }),
  http.get(`${defaultApiBaseUrl}/employees/:id`, ({ params }) => {
    const employee = defaultEmployeeDetailFixtures[String(params.id)];

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
);

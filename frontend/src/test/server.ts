import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

const defaultApiBaseUrl = "http://localhost:8000";

export const defaultCafeFixtures = [
  {
    id: "cafe-central-1",
    name: "Central Perk",
    description: "Flagship cafe in the financial district.",
    logo_url: "https://example.com/central-perk.png",
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
    logo_url: "https://example.com/harbour-grounds.png",
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
);

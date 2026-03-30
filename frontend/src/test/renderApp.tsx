import type { ReactNode } from "react";

import { QueryClientProvider } from "@tanstack/react-query";
import { App as AntApp, ConfigProvider } from "antd";
import { render } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";

import { createQueryClient } from "@/app/queryClient";
import { appRoutes } from "@/app/router";

const theme = {
  token: {
    colorPrimary: "#14532d",
    colorBgLayout: "#f3f7f2",
    colorBgContainer: "#ffffff",
    borderRadius: 14,
    fontFamily: "'Segoe UI', 'Helvetica Neue', sans-serif",
  },
};

export function renderRoute(initialEntry: string) {
  const router = createMemoryRouter(appRoutes, {
    initialEntries: [initialEntry],
  });
  // Tests get a fresh query client per render to avoid cache bleed between
  // route assertions and retry-state checks.
  const queryClient = createQueryClient();

  return render(
    <ConfigProvider theme={theme}>
      <AntApp>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </AntApp>
    </ConfigProvider>,
  );
}

export function renderWithProviders(node: ReactNode) {
  const queryClient = createQueryClient();

  return render(
    <ConfigProvider theme={theme}>
      <AntApp>
        <QueryClientProvider client={queryClient}>{node}</QueryClientProvider>
      </AntApp>
    </ConfigProvider>,
  );
}

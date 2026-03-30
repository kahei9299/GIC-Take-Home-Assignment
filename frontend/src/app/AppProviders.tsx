import type { PropsWithChildren } from "react";

import { QueryClientProvider } from "@tanstack/react-query";
import { App as AntApp, ConfigProvider } from "antd";

import { createQueryClient } from "@/app/queryClient";

// The query client is process-wide so route transitions share one cache and
// one retry policy baseline.
const queryClient = createQueryClient();

const theme = {
  token: {
    colorPrimary: "#14532d",
    colorBgLayout: "#f3f7f2",
    colorBgContainer: "#ffffff",
    borderRadius: 14,
    fontFamily: "'Segoe UI', 'Helvetica Neue', sans-serif",
  },
};

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ConfigProvider theme={theme}>
      <AntApp>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </AntApp>
    </ConfigProvider>
  );
}

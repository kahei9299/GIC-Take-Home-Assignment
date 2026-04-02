import type { PropsWithChildren } from "react";

import { QueryClientProvider } from "@tanstack/react-query";
import { App as AntApp, ConfigProvider } from "antd";

import { createQueryClient } from "@/app/queryClient";
import { appTheme } from "@/app/theme";

// The query client is process-wide so route transitions share one cache and
// one retry policy baseline.
const queryClient = createQueryClient();

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ConfigProvider theme={appTheme}>
      <AntApp>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </AntApp>
    </ConfigProvider>
  );
}

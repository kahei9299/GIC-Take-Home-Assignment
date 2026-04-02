import { RouterProvider } from "react-router-dom";

import { AppProviders } from "@/app/AppProviders";
import { createAppRouter } from "@/app/router";

// Keep a single router instance so route state and navigation remain stable
// for the lifetime of the browser app.
const router = createAppRouter();

export function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}

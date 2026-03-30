import { RouterProvider } from "react-router-dom";

import { AppProviders } from "@/app/AppProviders";
import { createAppRouter } from "@/app/router";

// Keep a single router instance for the browser app; route modules remain
// simple placeholders until the feature slices attach real loaders and forms.
const router = createAppRouter();

export function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}

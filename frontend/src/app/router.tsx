import { Navigate, createBrowserRouter } from "react-router-dom";

import { AppShell } from "@/components/layout/AppShell";
import { CafeCreateRoute } from "@/routes/cafes/CafeCreateRoute";
import { CafeEditRoute } from "@/routes/cafes/CafeEditRoute";
import { CafeListRoute } from "@/routes/cafes/CafeListRoute";
import { EmployeeCreateRoute } from "@/routes/employees/EmployeeCreateRoute";
import { EmployeeEditRoute } from "@/routes/employees/EmployeeEditRoute";
import { EmployeeListRoute } from "@/routes/employees/EmployeeListRoute";

// Keep the route paths stable so deep links, navigation, and backend-linked
// UI flows remain consistent across the application.
export const appRoutes = [
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate replace to="/cafes" /> },
      { path: "cafes", element: <CafeListRoute /> },
      { path: "cafes/new", element: <CafeCreateRoute /> },
      { path: "cafes/:id/edit", element: <CafeEditRoute /> },
      { path: "employees", element: <EmployeeListRoute /> },
      { path: "employees/new", element: <EmployeeCreateRoute /> },
      { path: "employees/:id/edit", element: <EmployeeEditRoute /> },
    ],
  },
];

export function createAppRouter() {
  return createBrowserRouter(appRoutes);
}

import { Navigate, createBrowserRouter } from "react-router-dom";

import { AppShell } from "@/components/layout/AppShell";
import { CafeCreateRoute } from "@/routes/cafes/CafeCreateRoute";
import { CafeEditRoute } from "@/routes/cafes/CafeEditRoute";
import { CafeListRoute } from "@/routes/cafes/CafeListRoute";
import { EmployeeCreateRoute } from "@/routes/employees/EmployeeCreateRoute";
import { EmployeeEditRoute } from "@/routes/employees/EmployeeEditRoute";
import { EmployeeListRoute } from "@/routes/employees/EmployeeListRoute";

// These are the stable route contracts for the frontend foundation increment.
// Later increments should fill these routes with feature behavior instead of
// changing the URL structure.
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

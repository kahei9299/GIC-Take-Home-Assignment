import type { MutableRefObject } from "react";

import type { QueryClient } from "@tanstack/react-query";
import { unstable_usePrompt, useBeforeUnload } from "react-router-dom";

export function useEmployeeLeaveGuard({
  isDirty,
  allowNavigationRef,
}: {
  isDirty: boolean;
  allowNavigationRef: MutableRefObject<boolean>;
}) {
  useBeforeUnload((event) => {
    if (!isDirty || allowNavigationRef.current) {
      return;
    }

    event.preventDefault();
    event.returnValue = "";
  });

  unstable_usePrompt({
    message: "You have unsaved changes. Leave this page?",
    when: ({ currentLocation, nextLocation }) =>
      isDirty &&
      !allowNavigationRef.current &&
      currentLocation.pathname !== nextLocation.pathname,
  });
}

export async function invalidateEmployeeWriteQueries(
  queryClient: QueryClient,
  {
    employeeId,
    cafeId,
  }: {
    employeeId?: string;
    cafeId?: string | null;
  } = {},
) {
  // Employee writes can affect the employee list, one employee detail view,
  // and cafe staffing counts that appear throughout the cafe slice.
  const invalidations: Array<Promise<unknown>> = [
    queryClient.invalidateQueries({ queryKey: ["employees", "list"] }),
    queryClient.invalidateQueries({ queryKey: ["cafes", "list"] }),
  ];

  if (employeeId) {
    invalidations.push(queryClient.invalidateQueries({ queryKey: ["employees", "detail", employeeId] }));
  }

  if (cafeId) {
    invalidations.push(queryClient.invalidateQueries({ queryKey: ["cafes", "detail", cafeId] }));
  }

  await Promise.all(invalidations);
}

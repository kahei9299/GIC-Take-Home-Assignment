import { useRef } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Form } from "antd";
import type { FormProps } from "antd";
import { useNavigate } from "react-router-dom";

import { createEmployee, listCafes } from "@/api/client";
import { ApiError } from "@/api/http";
import { QueryState } from "@/components/feedback/QueryState";
import { PageFrame } from "@/components/layout/PageFrame";
import {
  buildEmployeeCreatePayload,
  EMPTY_EMPLOYEE_FORM_VALUES,
  EmployeeFormFields,
  type EmployeeFormValues,
  hasDirtyEmployeeFormValues,
} from "@/routes/employees/employeeForm";
import { invalidateEmployeeWriteQueries, useEmployeeLeaveGuard } from "@/routes/employees/employeeRouteUtils";

const INITIAL_VALUES = EMPTY_EMPLOYEE_FORM_VALUES;

export function EmployeeCreateRoute() {
  const [form] = Form.useForm<EmployeeFormValues>();
  const formValues = Form.useWatch([], form);
  const allowNavigationRef = useRef(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const cafesQuery = useQuery({
    queryKey: ["cafes", "list", null],
    queryFn: () => listCafes(),
  });

  const isDirty = hasDirtyEmployeeFormValues(formValues, INITIAL_VALUES);
  useEmployeeLeaveGuard({ isDirty, allowNavigationRef });

  const createEmployeeMutation = useMutation({
    mutationFn: createEmployee,
    onSuccess: async (_, variables) => {
      allowNavigationRef.current = true;
      await invalidateEmployeeWriteQueries(queryClient, { cafeId: variables.cafe_id });
      navigate("/employees");
    },
    onError: () => {
      allowNavigationRef.current = false;
    },
  });

  const handleFinish: FormProps<EmployeeFormValues>["onFinish"] = (values) => {
    createEmployeeMutation.reset();
    createEmployeeMutation.mutate(buildEmployeeCreatePayload(values));
  };

  return (
    <PageFrame
      title="Create Employee"
      description="Capture one employee, require the initial cafe assignment expected by the backend, and return to the employee list after a successful create."
    >
      <QueryState
        isPending={cafesQuery.isPending}
        isError={cafesQuery.isError}
        onRetry={() => void cafesQuery.refetch()}
        pendingTitle="Loading cafe options"
        pendingDescription="Fetching the current cafe list so the employee can be assigned during create."
        errorTitle="Unable to load cafes"
        errorDescription="The backend did not complete the cafe-options read. Retry when the service is reachable again."
      >
        <EmployeeFormFields
          form={form}
          cafes={cafesQuery.data ?? []}
          initialValues={INITIAL_VALUES}
          onFinish={handleFinish}
          onValuesChange={() => {
            allowNavigationRef.current = false;
          }}
          submitLabel="Create Employee"
          submitLoading={createEmployeeMutation.isPending}
          onCancel={() => navigate("/employees")}
        />
        {createEmployeeMutation.isError ? (
          <Alert
            type="error"
            showIcon
            message="Unable to create employee"
            description={
              createEmployeeMutation.error instanceof ApiError
                ? createEmployeeMutation.error.message
                : "The backend rejected the request."
            }
            style={{ marginTop: 24 }}
          />
        ) : null}
      </QueryState>
    </PageFrame>
  );
}

import { useEffect, useMemo, useRef } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Form, Result } from "antd";
import type { FormProps } from "antd";
import { useNavigate, useParams } from "react-router-dom";

import { deleteEmployee, getEmployee, listCafes, updateEmployee } from "@/api/client";
import type { EmployeeWriteRequest } from "@/api/contracts";
import { ApiError } from "@/api/http";
import { QueryState } from "@/components/feedback/QueryState";
import { PageFrame } from "@/components/layout/PageFrame";
import {
  buildEmployeeWritePayload,
  EmployeeFormFields,
  type EmployeeFormValues,
  hasDirtyEmployeeFormValues,
  normalizeEmployeeFormValues,
} from "@/routes/employees/employeeForm";
import { invalidateEmployeeWriteQueries, useEmployeeLeaveGuard } from "@/routes/employees/employeeRouteUtils";

export function EmployeeEditRoute() {
  const { modal } = App.useApp();
  const [form] = Form.useForm<EmployeeFormValues>();
  const formValues = Form.useWatch([], form);
  const allowNavigationRef = useRef(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const employeeQuery = useQuery({
    enabled: Boolean(id),
    queryKey: ["employees", "detail", id],
    queryFn: () => getEmployee(id ?? ""),
  });

  const cafesQuery = useQuery({
    enabled: Boolean(id),
    queryKey: ["cafes", "list", null],
    queryFn: () => listCafes(),
  });

  const initialValues = useMemo(() => {
    if (!employeeQuery.data) {
      return null;
    }

    return normalizeEmployeeFormValues(employeeQuery.data);
  }, [employeeQuery.data]);

  useEffect(() => {
    if (!initialValues) {
      return;
    }

    form.setFieldsValue(initialValues);
    allowNavigationRef.current = false;
  }, [form, initialValues]);

  const isDirty = hasDirtyEmployeeFormValues(formValues, initialValues);
  useEmployeeLeaveGuard({ isDirty, allowNavigationRef });

  const updateEmployeeMutation = useMutation({
    mutationFn: (values: EmployeeWriteRequest) => updateEmployee(id ?? "", values),
    onSuccess: async () => {
      allowNavigationRef.current = true;
      await invalidateEmployeeWriteQueries(queryClient, { employeeId: id ?? "" });
      navigate("/employees");
    },
    onError: () => {
      allowNavigationRef.current = false;
    },
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: () => deleteEmployee(id ?? ""),
    onSuccess: async () => {
      allowNavigationRef.current = true;
      await invalidateEmployeeWriteQueries(queryClient, { employeeId: id ?? "" });
      navigate("/employees");
    },
    onError: () => {
      allowNavigationRef.current = false;
    },
  });

  const handleFinish: FormProps<EmployeeFormValues>["onFinish"] = (values) => {
    updateEmployeeMutation.reset();
    deleteEmployeeMutation.reset();
    updateEmployeeMutation.mutate(buildEmployeeWritePayload(values));
  };

  const handleDelete = () => {
    updateEmployeeMutation.reset();
    deleteEmployeeMutation.reset();

    modal.confirm({
      title: "Delete this employee?",
      content: "Deleting an employee also removes their assignment history. This action cannot be undone.",
      okText: "Delete Employee",
      cancelText: "Cancel",
      okButtonProps: { danger: true, loading: deleteEmployeeMutation.isPending },
      onOk: async () => {
        await deleteEmployeeMutation.mutateAsync().catch(() => undefined);
      },
    });
  };

  const readError = employeeQuery.error instanceof ApiError ? employeeQuery.error : null;
  const isNotFound = readError?.status === 404;
  // Edit stays blocked until both reads complete so the assignment select and
  // initial employee values never render in a partially hydrated state.
  const isReadPending = employeeQuery.isPending || cafesQuery.isPending;
  const isReadError = (employeeQuery.isError && !isNotFound) || cafesQuery.isError;

  return (
    <PageFrame
      title="Edit Employee"
      description="View and update employee details, including reassigning to a different cafe. Changes are not saved until the form is submitted."
    >
      {isNotFound || (!employeeQuery.isPending && !employeeQuery.isError && !employeeQuery.data) ? (
        <Result
          status="warning"
          title="Employee not found"
          subTitle="This employee no longer exists or the URL is invalid."
          extra={
            <Button type="primary" onClick={() => navigate("/employees")}>
              Return to employees
            </Button>
          }
        />
      ) : (
        <QueryState
          isPending={isReadPending}
          isError={isReadError}
          onRetry={() => {
            void Promise.all([employeeQuery.refetch(), cafesQuery.refetch()]);
          }}
          pendingTitle="Loading employee details"
          pendingDescription="Fetching the latest employee record and cafe options from the backend."
          errorTitle="Unable to load employee details"
          errorDescription="The backend did not complete this employee edit read. Retry when the service is reachable again."
        >
          <EmployeeFormFields
            form={form}
            cafes={cafesQuery.data ?? []}
            initialValues={initialValues ?? undefined}
            onFinish={handleFinish}
            onValuesChange={() => {
              allowNavigationRef.current = false;
            }}
            submitLabel="Save Changes"
            submitLoading={updateEmployeeMutation.isPending}
            onCancel={() => navigate("/employees")}
            cancelDisabled={deleteEmployeeMutation.isPending}
            assignmentRequired={false}
            includeUnassignedOption
            extraActions={
              <Button
                danger
                onClick={handleDelete}
                loading={deleteEmployeeMutation.isPending}
                disabled={updateEmployeeMutation.isPending}
              >
                Delete Employee
              </Button>
            }
          />
          {updateEmployeeMutation.isError ? (
            <Alert
              type="error"
              showIcon
              message="Unable to update employee"
              description={
                updateEmployeeMutation.error instanceof ApiError
                  ? updateEmployeeMutation.error.message
                  : "The backend rejected the update."
              }
              style={{ marginTop: 24 }}
            />
          ) : null}
          {deleteEmployeeMutation.isError ? (
            <Alert
              type="error"
              showIcon
              message="Unable to delete employee"
              description={
                deleteEmployeeMutation.error instanceof ApiError
                  ? deleteEmployeeMutation.error.message
                  : "The backend rejected the delete request."
              }
              style={{ marginTop: 24 }}
            />
          ) : null}
        </QueryState>
      )}
    </PageFrame>
  );
}

import { useMemo, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Card, Space, Tag, Typography } from "antd";
import { useNavigate, useSearchParams } from "react-router-dom";

import { deleteEmployee, getCafe, listEmployees } from "@/api/client";
import type { EmployeeListItem } from "@/api/contracts";
import { ApiError } from "@/api/http";
import { QueryState } from "@/components/feedback/QueryState";
import { PageFrame } from "@/components/layout/PageFrame";
import { EmployeeListGrid } from "@/routes/employees/EmployeeListGrid";
import { EmployeeListToolbar } from "@/routes/employees/EmployeeListToolbar";

export function EmployeeListRoute() {
  const { modal } = App.useApp();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const cafeId = searchParams.get("cafe") ?? searchParams.get("cafe_id") ?? "";
  const [cafeNameDraft, setCafeNameDraft] = useState("");
  const [committedCafeName, setCommittedCafeName] = useState("");
  const [deletingEmployeeId, setDeletingEmployeeId] = useState<string | null>(null);

  const employeesQuery = useQuery({
    // `cafe` is the primary deep-link contract from the cafe slice; legacy
    // `cafe_id` links are still accepted during the transition.
    queryKey: ["employees", "list", cafeId || null],
    queryFn: () => listEmployees(cafeId || undefined),
  });

  const cafeFilterQuery = useQuery({
    enabled: Boolean(cafeId),
    queryKey: ["cafes", "detail", cafeId],
    // The extra cafe detail lookup is only for human-readable filter context.
    // The employee list remains usable even if this lookup fails.
    queryFn: () => getCafe(cafeId),
  });

  const employees = employeesQuery.data ?? [];
  const hasActiveFilter = cafeId.length > 0;
  const hasActiveCafeNameFilter = committedCafeName.length > 0;

  const filterLabel = useMemo(() => {
    if (!hasActiveFilter) {
      return null;
    }

    if (cafeFilterQuery.data?.name) {
      return `Showing employees currently assigned to ${cafeFilterQuery.data.name}.`;
    }

    // Degrade safely if cafe-name resolution fails while the employee list
    // itself still succeeds.
    return "Showing employees filtered by cafe.";
  }, [cafeFilterQuery.data?.name, hasActiveFilter]);

  const filteredEmployees = useMemo(() => {
    if (!hasActiveCafeNameFilter) {
      return employees;
    }

    const requestedCafeName = committedCafeName.trim().toLocaleLowerCase();
    return employees.filter((employee) =>
      (employee.cafe ?? "").toLocaleLowerCase().includes(requestedCafeName),
    );
  }, [committedCafeName, employees, hasActiveCafeNameFilter]);

  const applyCafeNameFilter = () => {
    setCommittedCafeName(cafeNameDraft.trim());
  };

  const clearCafeNameFilter = () => {
    setCafeNameDraft("");
    setCommittedCafeName("");
  };

  const deleteEmployeeMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      setDeletingEmployeeId(employeeId);
      await deleteEmployee(employeeId);
    },
    onSuccess: async () => {
      // Employee deletes can change cafe staffing counts as well as the
      // employee list rows, so both lists are treated as stale.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["employees", "list"] }),
        queryClient.invalidateQueries({ queryKey: ["cafes", "list"] }),
      ]);
    },
    onSettled: () => {
      setDeletingEmployeeId(null);
    },
  });

  const handleDeleteEmployee = (employee: EmployeeListItem) => {
    deleteEmployeeMutation.reset();

    modal.confirm({
      title: "Delete this employee?",
      content: "Deleting an employee also removes their assignment history. This action cannot be undone.",
      okText: "Delete Employee",
      cancelText: "Cancel",
      okButtonProps: { danger: true, loading: deletingEmployeeId === employee.id },
      onOk: async () => {
        // Swallow the rejected promise here so the modal can stay open long
        // enough for the route-level error alert to render consistently.
        await deleteEmployeeMutation.mutateAsync(employee.id).catch(() => undefined);
      },
    });
  };

  return (
    <PageFrame
      title="Employees"
      description="Browse employee records, filter by cafe name, and manage employees by creating or deleting them."
    >
      <EmployeeListToolbar
        addEmployeeHref="/employees/new"
        cafeNameDraft={cafeNameDraft}
        hasActiveFilter={hasActiveCafeNameFilter}
        onApply={applyCafeNameFilter}
        onClear={clearCafeNameFilter}
        onCafeNameDraftChange={setCafeNameDraft}
      />
      <Card>
        <Space direction="vertical" size={16} style={{ display: "flex" }}>
          {hasActiveFilter ? (
            <Space wrap>
              <Tag color="green">Cafe filter active</Tag>
              {/* The deep-link filter stays outside the local toolbar so the
                  backend-owned cafe state remains distinct from the local
                  cafe-name filter applied to already loaded rows. */}
              <Typography.Text>{filterLabel}</Typography.Text>
              <Button size="small" onClick={() => navigate("/employees")}>
                Clear deep link
              </Button>
            </Space>
          ) : null}
          <QueryState
            empty={employeesQuery.isSuccess && filteredEmployees.length === 0}
            emptyDescription={
              hasActiveCafeNameFilter
                ? `No employees matched the cafe-name filter "${committedCafeName}". Clear the cafe-name filter to view the current employee results again.`
                : hasActiveFilter
                ? "No employees are currently assigned to this cafe. Clear the filter to view the full employee list."
                : "No employees are available yet. Add one to begin the employee workflow."
            }
            emptyExtra={
              hasActiveCafeNameFilter ? (
                <Button onClick={clearCafeNameFilter}>Clear</Button>
              ) : hasActiveFilter ? (
                <Button onClick={() => navigate("/employees")}>Clear deep link</Button>
              ) : null
            }
            emptyTitle={
              hasActiveCafeNameFilter
                ? "No employees matched this cafe name"
                : hasActiveFilter
                ? "No employees matched this cafe"
                : "No employees to display"
            }
            errorDescription="The backend did not complete the employee list read. Retry when the service is reachable again."
            errorTitle="Unable to load employees"
            isError={employeesQuery.isError}
            isPending={employeesQuery.isPending}
            onRetry={() => void employeesQuery.refetch()}
            pendingDescription="Loading the latest employee list from the backend."
            pendingTitle="Loading employees"
          >
            {filteredEmployees.length > 0 ? (
              <EmployeeListGrid
                employees={filteredEmployees}
                onDeleteEmployee={handleDeleteEmployee}
                deletingEmployeeId={deletingEmployeeId}
              />
            ) : null}
          </QueryState>
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
            />
          ) : null}
          {!hasActiveFilter && !hasActiveCafeNameFilter && employeesQuery.isSuccess && filteredEmployees.length === 0 ? (
            <Button type="primary" href="/employees/new" style={{ width: "fit-content" }}>
              Add Employee
            </Button>
          ) : null}
        </Space>
      </Card>
    </PageFrame>
  );
}

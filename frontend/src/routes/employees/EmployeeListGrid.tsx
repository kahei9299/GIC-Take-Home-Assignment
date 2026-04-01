import type { ColDef, ICellRendererParams } from "ag-grid-community";
import type { EmployeeListItem } from "@/api/contracts";

import { Button, Space, Typography } from "antd";
import { AgGridReact } from "ag-grid-react";

import { defaultGridOptions } from "@/components/grid/defaultGridOptions";

type EmployeeListGridProps = {
  employees: EmployeeListItem[];
  onDeleteEmployee: (employee: EmployeeListItem) => void;
  deletingEmployeeId?: string | null;
};

function buildColumns({
  deletingEmployeeId,
  onDeleteEmployee,
}: {
  deletingEmployeeId?: string | null;
  onDeleteEmployee: (employee: EmployeeListItem) => void;
}): ColDef<EmployeeListItem>[] {
  const renderName = ({ data }: ICellRendererParams<EmployeeListItem>) =>
    data ? (
      <Typography.Text strong title={data.name}>
        {data.name}
      </Typography.Text>
    ) : null;

  const renderEmail = ({ data }: ICellRendererParams<EmployeeListItem>) =>
    data ? (
      <Typography.Text title={data.email_address}>
        {data.email_address}
      </Typography.Text>
    ) : null;

  const renderPhone = ({ data }: ICellRendererParams<EmployeeListItem>) =>
    data ? (
      <Typography.Text title={data.phone_number}>
        {data.phone_number}
      </Typography.Text>
    ) : null;

  const renderCafe = ({ data }: ICellRendererParams<EmployeeListItem>) => {
    if (!data) {
      return null;
    }

    // Unassigned is rendered explicitly so assignment state is readable without
    // opening the employee detail route.
    return data.cafe ? (
      <Typography.Text title={data.cafe}>{data.cafe}</Typography.Text>
    ) : (
      <Typography.Text type="secondary">Unassigned</Typography.Text>
    );
  };

  const renderActions = ({ data }: ICellRendererParams<EmployeeListItem>) =>
    data ? (
      <div style={{ display: "flex", alignItems: "center", height: "100%" }}>
        <Space size={8}>
          <Button aria-label={`Edit ${data.name}`} href={`/employees/${data.id}/edit`} size="small" type="default">
            Edit
          </Button>
          <Button
            aria-label={`Delete ${data.name}`}
            danger
            size="small"
            type="default"
            loading={deletingEmployeeId === data.id}
            onClick={() => onDeleteEmployee(data)}
          >
            Delete
          </Button>
        </Space>
      </div>
    ) : null;

  return [
    {
      field: "id",
      headerName: "ID",
      minWidth: 170,
    },
    {
      field: "name",
      headerName: "Name",
      minWidth: 170,
      cellRenderer: renderName,
    },
    {
      field: "email_address",
      headerName: "Email",
      minWidth: 220,
      cellRenderer: renderEmail,
    },
    {
      field: "phone_number",
      headerName: "Phone",
      minWidth: 160,
      cellRenderer: renderPhone,
    },
    {
      field: "days_worked",
      headerName: "Days Worked",
      minWidth: 140,
      maxWidth: 160,
    },
    {
      field: "cafe",
      headerName: "Cafe",
      minWidth: 190,
      cellRenderer: renderCafe,
    },
    {
      colId: "actions",
      headerName: "Actions",
      sortable: false,
      minWidth: 120,
      maxWidth: 140,
      cellRenderer: renderActions,
    },
  ];
}

export function EmployeeListGrid({
  employees,
  onDeleteEmployee,
  deletingEmployeeId,
}: EmployeeListGridProps) {
  return (
    <div className="ag-theme-quartz" style={{ height: 420 }}>
      <AgGridReact<EmployeeListItem>
        columnDefs={buildColumns({ deletingEmployeeId, onDeleteEmployee })}
        gridOptions={defaultGridOptions}
        rowData={employees}
      />
    </div>
  );
}

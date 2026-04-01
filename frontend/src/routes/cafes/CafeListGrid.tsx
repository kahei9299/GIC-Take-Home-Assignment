import type { ColDef, ICellRendererParams, ValueFormatterParams } from "ag-grid-community";
import type { CafeListItem } from "@/api/contracts";

import { Button, Space, Typography } from "antd";
import { AgGridReact } from "ag-grid-react";
import { Link } from "react-router-dom";

import { defaultGridOptions } from "@/components/grid/defaultGridOptions";

type CafeListGridProps = {
  cafes: CafeListItem[];
  onDeleteCafe: (cafe: CafeListItem) => void;
  deletingCafeId?: string | null;
};

function buildColumns({
  deletingCafeId,
  onDeleteCafe,
}: {
  deletingCafeId?: string | null;
  onDeleteCafe: (cafe: CafeListItem) => void;
}): ColDef<CafeListItem>[] {
  const renderName = ({ data }: ICellRendererParams<CafeListItem>) =>
    data ? (
      <Typography.Text strong title={data.name}>
        {data.name}
      </Typography.Text>
    ) : null;

  const renderDescription = ({ data }: ICellRendererParams<CafeListItem>) =>
    data ? (
      <Typography.Text
        style={{
          display: "inline-block",
          maxWidth: "100%",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={data.description}
      >
        {data.description}
      </Typography.Text>
    ) : null;

  const renderEmployees = ({ data }: ICellRendererParams<CafeListItem>) => {
    if (!data) {
      return null;
    }

    if (data.employees === 0) {
      return <Typography.Text type="secondary">0 employees</Typography.Text>;
    }

    // The employee count cell is the stable deep-link into the employee list.
    return <Link to={`/employees?cafe_id=${encodeURIComponent(data.id)}`}>{`${data.employees} employees`}</Link>;
  };

  const formatLogo = ({ value }: ValueFormatterParams<CafeListItem>) => (value ? "Available" : "None");

  const renderActions = ({ data }: ICellRendererParams<CafeListItem>) =>
    data ? (
      <div style={{ display: "flex", alignItems: "center", height: "100%" }}>
        <Space size={8}>
          <Button aria-label={`Edit ${data.name}`} href={`/cafes/${data.id}/edit`} size="small" type="default">
            Edit
          </Button>
          <Button
            aria-label={`Delete ${data.name}`}
            danger
            size="small"
            type="default"
            loading={deletingCafeId === data.id}
            onClick={() => onDeleteCafe(data)}
          >
            Delete
          </Button>
        </Space>
      </div>
    ) : null;

  return [
    {
      field: "name",
      headerName: "Cafe",
      minWidth: 180,
      cellRenderer: renderName,
    },
    {
      field: "description",
      headerName: "Description",
      minWidth: 240,
      cellRenderer: renderDescription,
    },
    {
      field: "logo_url",
      headerName: "Logo",
      minWidth: 120,
      maxWidth: 150,
      valueFormatter: formatLogo,
    },
    {
      field: "location",
      headerName: "Location",
      minWidth: 180,
    },
    {
      field: "employees",
      headerName: "Employees",
      minWidth: 160,
      maxWidth: 180,
      cellRenderer: renderEmployees,
    },
    {
      colId: "actions",
      headerName: "Actions",
      sortable: false,
      minWidth: 140,
      maxWidth: 160,
      cellRenderer: renderActions,
    },
  ];
}

export function CafeListGrid({ cafes, onDeleteCafe, deletingCafeId }: CafeListGridProps) {
  return (
    <div className="ag-theme-quartz" style={{ height: 420 }}>
      <AgGridReact<CafeListItem>
        columnDefs={buildColumns({ deletingCafeId, onDeleteCafe })}
        gridOptions={defaultGridOptions}
        rowData={cafes}
      />
    </div>
  );
}

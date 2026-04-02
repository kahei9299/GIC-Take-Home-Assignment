import type { ColDef } from "ag-grid-community";

import { Card, Typography } from "antd";
import { AgGridReact } from "ag-grid-react";

import { defaultGridOptions } from "@/components/grid/defaultGridOptions";

type PreviewRow = {
  name: string;
  value: string;
};

const previewColumns: ColDef<PreviewRow>[] = [
  { field: "name", headerName: "Column" },
  { field: "value", headerName: "Preview" },
];

const previewRows: PreviewRow[] = [
  { name: "Status", value: "AG Grid mounted" },
  { name: "Usage", value: "Shared grid defaults available" },
];

export function GridFoundationPreview() {
  return (
    <Card title="Grid foundation">
      <Typography.Paragraph>
        AG Grid is installed and wrapped with shared defaults that can be reused across tabular views.
      </Typography.Paragraph>
      <div className="ag-theme-quartz" style={{ height: 220 }}>
        <AgGridReact<PreviewRow>
          gridOptions={defaultGridOptions}
          columnDefs={previewColumns}
          rowData={previewRows}
        />
      </div>
    </Card>
  );
}

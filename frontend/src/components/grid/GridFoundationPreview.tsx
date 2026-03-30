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
  { name: "Usage", value: "Business columns arrive in later increments" },
];

export function GridFoundationPreview() {
  return (
    <Card title="Grid foundation">
      <Typography.Paragraph>
        AG Grid is installed and wrapped with shared defaults so the cafe and employee list slices can
        plug in real column definitions later.
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

import type { GridOptions } from "ag-grid-community";

// Shared defaults keep cafe and employee grids visually consistent while still
// allowing each route to define its own columns and actions.
export const defaultGridOptions: GridOptions = {
  rowHeight: 42,
  headerHeight: 44,
  suppressMovableColumns: true,
  suppressMenuHide: true,
  animateRows: true,
  defaultColDef: {
    sortable: true,
    resizable: true,
    filter: false,
    flex: 1,
    minWidth: 120,
  },
};

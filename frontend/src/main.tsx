import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import "antd/dist/reset.css";

import React from "react";
import ReactDOM from "react-dom/client";

import { App } from "@/app/App";
import "@/components/grid/registerGridModules";
import "@/styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

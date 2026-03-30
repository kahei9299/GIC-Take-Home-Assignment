import { BackendHealthCard } from "@/routes/shared/BackendHealthCard";
import { FeaturePlaceholderCard } from "@/routes/shared/FeaturePlaceholderCard";
import { GridFoundationPreview } from "@/components/grid/GridFoundationPreview";
import { PageFrame } from "@/components/layout/PageFrame";

export function EmployeeListRoute() {
  return (
    <PageFrame
      title="Employees"
      description="The employee route foundation mirrors the cafe shell so later CRUD and assignment flows can share one stable frontend base."
      aside={<BackendHealthCard />}
    >
      <FeaturePlaceholderCard
        title="Employee list foundation"
        summary="Increment 15 will add the employee grid, deep-link filtering, and assignment-aware action flows on top of this route scaffold."
        primaryActionLabel="Open employee create route"
        primaryActionTo="/employees/new"
      />
      <GridFoundationPreview />
    </PageFrame>
  );
}

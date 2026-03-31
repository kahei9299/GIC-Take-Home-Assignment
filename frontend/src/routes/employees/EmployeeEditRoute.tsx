import { FeaturePlaceholderCard } from "@/routes/shared/FeaturePlaceholderCard";
import { PageFrame } from "@/components/layout/PageFrame";

export function EmployeeEditRoute() {
  return (
    <PageFrame
      title="Edit Employee"
      description="This route is wired for direct deep links and will host employee detail loading in the next employee-focused increment."
    >
      <FeaturePlaceholderCard
        title="Employee edit form deferred"
        summary="Increment 20 will add the edit query, reassignment workflow, delete confirmation, and retryable error handling."
      />
    </PageFrame>
  );
}

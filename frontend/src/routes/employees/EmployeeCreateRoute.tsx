import { FeaturePlaceholderCard } from "@/routes/shared/FeaturePlaceholderCard";
import { PageFrame } from "@/components/layout/PageFrame";

export function EmployeeCreateRoute() {
  return (
    <PageFrame
      title="Create Employee"
      description="The route exists now so Increment 19 can focus on assignment-aware form behavior instead of bootstrap wiring."
    >
      <FeaturePlaceholderCard
        title="Employee create form deferred"
        summary="Increment 19 will attach validation, optional assignment state, and mutation-driven cache invalidation."
      />
    </PageFrame>
  );
}

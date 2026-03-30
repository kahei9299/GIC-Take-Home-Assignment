import { FeaturePlaceholderCard } from "@/routes/shared/FeaturePlaceholderCard";
import { PageFrame } from "@/components/layout/PageFrame";

export function EmployeeCreateRoute() {
  return (
    <PageFrame
      title="Create Employee"
      description="The route exists now so Increment 15 can focus on assignment-aware form behavior instead of bootstrap wiring."
    >
      <FeaturePlaceholderCard
        title="Employee create form deferred"
        summary="Increment 15 will attach validation, optional assignment state, and mutation-driven cache invalidation."
      />
    </PageFrame>
  );
}

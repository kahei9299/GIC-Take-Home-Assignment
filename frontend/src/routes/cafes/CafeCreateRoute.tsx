import { FeaturePlaceholderCard } from "@/routes/shared/FeaturePlaceholderCard";
import { PageFrame } from "@/components/layout/PageFrame";

export function CafeCreateRoute() {
  return (
    <PageFrame
      title="Create Cafe"
      description="The routed page and shell exist now so later increments can layer in form state, validation, and mutations without changing navigation structure."
    >
      <FeaturePlaceholderCard
        title="Cafe create form deferred"
        summary="Increment 14 will add the actual Ant Design form, mutation flow, and dirty-form guard for cafe creation."
      />
    </PageFrame>
  );
}

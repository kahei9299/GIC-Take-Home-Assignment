import { BackendHealthCard } from "@/routes/shared/BackendHealthCard";
import { FeaturePlaceholderCard } from "@/routes/shared/FeaturePlaceholderCard";
import { GridFoundationPreview } from "@/components/grid/GridFoundationPreview";
import { PageFrame } from "@/components/layout/PageFrame";

export function CafeListRoute() {
  return (
    <PageFrame
      title="Cafes"
      description="This route establishes the app shell, backend connectivity checks, and shared grid foundation before the cafe list workflow is implemented."
      aside={<BackendHealthCard />}
    >
      <FeaturePlaceholderCard
        title="Cafe list foundation"
        summary="Location filtering, AG Grid columns, and destructive actions arrive in Increment 14. This page already owns the stable route, provider stack, and backend-safe read handling."
        primaryActionLabel="Open cafe create route"
        primaryActionTo="/cafes/new"
      />
      <GridFoundationPreview />
    </PageFrame>
  );
}

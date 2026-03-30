import { FeaturePlaceholderCard } from "@/routes/shared/FeaturePlaceholderCard";
import { PageFrame } from "@/components/layout/PageFrame";

export function CafeEditRoute() {
  return (
    <PageFrame
      title="Edit Cafe"
      description="This route already resolves direct navigation and will host the dedicated detail query in the next slice."
    >
      <FeaturePlaceholderCard
        title="Cafe edit form deferred"
        summary="Increment 14 will attach the detail fetch, mutation lifecycle, validation handling, and delete confirmation."
      />
    </PageFrame>
  );
}

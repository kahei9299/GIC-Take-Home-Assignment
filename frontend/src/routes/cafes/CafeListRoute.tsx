import { useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Card } from "antd";

import { deleteCafe, listCafes } from "@/api/client";
import type { CafeListItem } from "@/api/contracts";
import { ApiError } from "@/api/http";
import { QueryState } from "@/components/feedback/QueryState";
import { PageFrame } from "@/components/layout/PageFrame";
import { CafeListGrid } from "@/routes/cafes/CafeListGrid";
import { CafeListToolbar } from "@/routes/cafes/CafeListToolbar";

export function CafeListRoute() {
  const { modal } = App.useApp();
  const [committedLocation, setCommittedLocation] = useState("");
  const [locationDraft, setLocationDraft] = useState("");
  const queryClient = useQueryClient();

  const cafesQuery = useQuery({
    // The backend stays responsible for location filtering; the frontend only
    // stores the local input state and sends the committed filter.
    queryKey: ["cafes", "list", committedLocation || null],
    queryFn: () => listCafes(committedLocation || undefined),
  });

  const applyLocationFilter = () => {
    setCommittedLocation(locationDraft.trim());
  };

  const clearLocationFilter = () => {
    setLocationDraft("");
    setCommittedLocation("");
  };

  const cafes = cafesQuery.data ?? [];
  const hasActiveFilter = committedLocation.length > 0;

  const deleteCafeMutation = useMutation({
    mutationFn: (cafeId: string) => deleteCafe(cafeId),
    onSuccess: async () => {
      // The list route owns direct-delete orchestration, so a single list
      // invalidation is enough to refresh the visible grid after success.
      await queryClient.invalidateQueries({ queryKey: ["cafes", "list"] });
    },
  });

  const handleDeleteCafe = (cafe: CafeListItem) => {
    deleteCafeMutation.reset();

    modal.confirm({
      title: `Delete ${cafe.name}?`,
      content:
        "Deleting a cafe also removes employees who are currently assigned to it. This action cannot be undone.",
      okText: "Delete Cafe",
      cancelText: "Cancel",
      okButtonProps: { danger: true },
      onOk: async () => {
        // The modal should stay open on success/failure handling without
        // leaking rejected promises into the test/runtime environment.
        await deleteCafeMutation.mutateAsync(cafe.id).catch(() => undefined);
      },
    });
  };

  return (
    <PageFrame
      title="Cafes"
      description="Browse the cafe list, filter by location, and manage cafes by creating or deleting them."
    >
      <CafeListToolbar
        addCafeHref="/cafes/new"
        hasActiveFilter={hasActiveFilter}
        locationDraft={locationDraft}
        onApply={applyLocationFilter}
        onClear={clearLocationFilter}
        onLocationDraftChange={setLocationDraft}
      />
      <Card>
        {deleteCafeMutation.isError ? (
          <Alert
            type="error"
            showIcon
            message="Unable to delete cafe"
            description={
              deleteCafeMutation.error instanceof ApiError
                ? deleteCafeMutation.error.message
                : "The backend rejected the delete request."
            }
            style={{ marginBottom: 24 }}
          />
        ) : null}
        <QueryState
          empty={cafesQuery.isSuccess && cafes.length === 0}
          emptyDescription={
            hasActiveFilter
              ? `No cafes matched the backend filter for "${committedLocation}". Clear the filter to load the full list again.`
              : "No cafes are available yet."
          }
          emptyExtra={
            hasActiveFilter ? (
              <Button onClick={clearLocationFilter} style={{ width: "fit-content" }}>
                Clear filter
              </Button>
            ) : null
          }
          emptyTitle={hasActiveFilter ? "No cafes matched this location" : "No cafes to display"}
          errorDescription="The backend did not complete the cafe list read. Retry when the service is reachable again."
          errorTitle="Unable to load cafes"
          isError={cafesQuery.isError}
          isPending={cafesQuery.isPending}
          onRetry={() => void cafesQuery.refetch()}
          pendingDescription="Loading the latest cafe list from the backend."
          pendingTitle="Loading cafes"
        >
          <CafeListGrid
            cafes={cafes}
            deletingCafeId={deleteCafeMutation.isPending ? deleteCafeMutation.variables : null}
            onDeleteCafe={handleDeleteCafe}
          />
        </QueryState>
      </Card>
    </PageFrame>
  );
}

import { useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { Button, Card } from "antd";

import { listCafes } from "@/api/client";
import { QueryState } from "@/components/feedback/QueryState";
import { PageFrame } from "@/components/layout/PageFrame";
import { CafeListGrid } from "@/routes/cafes/CafeListGrid";
import { CafeListToolbar } from "@/routes/cafes/CafeListToolbar";

export function CafeListRoute() {
  const [committedLocation, setCommittedLocation] = useState("");
  const [locationDraft, setLocationDraft] = useState("");

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

  return (
    <PageFrame
      title="Cafes"
      description="Browse the cafe list, send location filters to the backend, and use simple navigation into the next cafe and employee workflows."
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
          <CafeListGrid cafes={cafes} />
        </QueryState>
      </Card>
    </PageFrame>
  );
}

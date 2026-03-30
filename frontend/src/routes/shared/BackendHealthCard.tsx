import { useQuery } from "@tanstack/react-query";
import { Card, Descriptions } from "antd";

import { getHealth } from "@/api/client";
import { QueryState } from "@/components/feedback/QueryState";

export function BackendHealthCard() {
  const healthQuery = useQuery({
    // The shell uses `/health` as a lightweight proof that the configured
    // frontend origin can reach the backend at all.
    queryKey: ["backend", "health"],
    queryFn: getHealth,
  });

  return (
    <Card title="Backend connectivity">
      <QueryState
        isPending={healthQuery.isPending}
        isError={healthQuery.isError}
        errorTitle="Unable to reach the backend"
        errorDescription="Safe read connectivity is failing. The shared query layer exposes a retry action instead of crashing the route."
        onRetry={() => void healthQuery.refetch()}
      >
        <Descriptions column={1} size="small">
          <Descriptions.Item label="Status">{healthQuery.data?.status ?? "unknown"}</Descriptions.Item>
          <Descriptions.Item label="Source">FastAPI /health</Descriptions.Item>
          <Descriptions.Item label="Retry policy">GET requests only</Descriptions.Item>
        </Descriptions>
      </QueryState>
    </Card>
  );
}

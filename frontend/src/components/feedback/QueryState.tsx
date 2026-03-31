import type { ReactNode } from "react";

import { Button, Result, Skeleton, Space, Typography } from "antd";

type QueryStateProps = {
  isPending?: boolean;
  pendingTitle?: string;
  pendingDescription?: string;
  isError?: boolean;
  errorTitle?: string;
  errorDescription?: string;
  onRetry?: () => void;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyExtra?: ReactNode;
  children?: ReactNode;
};

export function QueryState({
  isPending,
  pendingTitle = "Loading",
  pendingDescription = "Fetching the latest safe-read data from the backend.",
  isError,
  errorTitle = "Unable to load data",
  errorDescription = "The backend did not complete this safe read. Retry when the service is reachable again.",
  onRetry,
  empty,
  emptyTitle = "Nothing to show yet",
  emptyDescription = "This route foundation is ready, but the feature slice has not been implemented yet.",
  emptyExtra,
  children,
}: QueryStateProps) {
  if (isPending) {
    return (
      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        <div>
          <Typography.Title level={4} style={{ marginBottom: 0 }}>
            {pendingTitle}
          </Typography.Title>
          <Typography.Paragraph style={{ marginBottom: 0 }}>{pendingDescription}</Typography.Paragraph>
        </div>
        <Skeleton active paragraph={{ rows: 4 }} />
      </Space>
    );
  }

  if (isError) {
    return (
      <Result
        status="warning"
        title={errorTitle}
        subTitle={errorDescription}
        extra={
          onRetry ? (
            <Button type="primary" onClick={onRetry}>
              Retry request
            </Button>
          ) : null
        }
      />
    );
  }

  if (empty) {
    return (
      <Space direction="vertical" size={8}>
        <Typography.Title level={4} style={{ marginBottom: 0 }}>
          {emptyTitle}
        </Typography.Title>
        <Typography.Paragraph style={{ marginBottom: 0 }}>{emptyDescription}</Typography.Paragraph>
        {emptyExtra}
      </Space>
    );
  }

  return <>{children}</>;
}

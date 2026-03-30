import { Button, Card, Space, Tag, Typography } from "antd";
import { Link } from "react-router-dom";

type FeaturePlaceholderCardProps = {
  title: string;
  summary: string;
  primaryActionLabel?: string;
  primaryActionTo?: string;
};

export function FeaturePlaceholderCard({
  title,
  summary,
  primaryActionLabel,
  primaryActionTo,
}: FeaturePlaceholderCardProps) {
  return (
    <Card>
      <Space direction="vertical" size={16} style={{ display: "flex" }}>
        <div>
          <Typography.Title level={4}>{title}</Typography.Title>
          <Typography.Paragraph>{summary}</Typography.Paragraph>
        </div>
        <Space wrap>
          <Tag color="blue">Route wired</Tag>
          <Tag color="green">Query provider ready</Tag>
          <Tag color="gold">Business UI deferred</Tag>
        </Space>
        {primaryActionLabel && primaryActionTo ? (
          <Link to={primaryActionTo}>
            <Button type="primary">{primaryActionLabel}</Button>
          </Link>
        ) : null}
      </Space>
    </Card>
  );
}

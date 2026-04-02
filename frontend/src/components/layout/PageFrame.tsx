import type { PropsWithChildren, ReactNode } from "react";

import { Card, Col, Row, Space, Typography } from "antd";

type PageFrameProps = PropsWithChildren<{
  title: string;
  description: string;
  aside?: ReactNode;
}>;

export function PageFrame({ title, description, aside, children }: PageFrameProps) {
  return (
    <Space direction="vertical" size={24} style={{ display: "flex" }}>
      <Card className="page-frame__hero">
        <Typography.Title className="page-frame__title" level={2} style={{ marginTop: 0 }}>
          {title}
        </Typography.Title>
        <Typography.Paragraph className="page-frame__description" style={{ marginBottom: 0, maxWidth: 760 }}>
          {description}
        </Typography.Paragraph>
      </Card>
      <Row gutter={[24, 24]}>
        <Col xs={24} xl={aside ? 16 : 24}>
          <Space direction="vertical" size={24} style={{ display: "flex" }}>
            {children}
          </Space>
        </Col>
        {aside ? (
          <Col xs={24} xl={8}>
            <Space direction="vertical" size={24} style={{ display: "flex" }}>
              {aside}
            </Space>
          </Col>
        ) : null}
      </Row>
    </Space>
  );
}

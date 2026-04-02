import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { Button, Card, Flex, Input, Space, Typography } from "antd";

type CafeListToolbarProps = {
  locationDraft: string;
  onLocationDraftChange: (value: string) => void;
  onApply: () => void;
  onClear: () => void;
  addCafeHref: string;
  hasActiveFilter: boolean;
};

export function CafeListToolbar({
  locationDraft,
  onLocationDraftChange,
  onApply,
  onClear,
  addCafeHref,
  hasActiveFilter,
}: CafeListToolbarProps) {
  return (
    <Card className="directory-toolbar">
      <Flex align="center" justify="space-between" gap={16} wrap>
        <Space direction="vertical" size={4}>
          <Typography.Title className="directory-toolbar__title" level={4} style={{ margin: 0 }}>
            Cafe directory
          </Typography.Title>
          <Typography.Text className="directory-toolbar__copy" type="secondary">
            Filter by location.
          </Typography.Text>
        </Space>
        <Button href={addCafeHref} type="primary" icon={<PlusOutlined />} size="large">
          Add Cafe
        </Button>
      </Flex>
      <Flex gap={12} wrap style={{ marginTop: 20 }}>
        <Input
          allowClear
          aria-label="Location filter"
          placeholder="Filter by location"
          prefix={<SearchOutlined />}
          size="large"
          value={locationDraft}
          onChange={(event) => onLocationDraftChange(event.target.value)}
          onPressEnter={onApply}
          style={{ flex: "1 1 320px", minWidth: 260 }}
        />
        <Button type="primary" size="large" onClick={onApply}>
          Apply
        </Button>
        <Button size="large" onClick={onClear} disabled={!hasActiveFilter && locationDraft.length === 0}>
          Clear
        </Button>
      </Flex>
    </Card>
  );
}

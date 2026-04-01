import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { Button, Card, Flex, Input, Space, Typography } from "antd";

type EmployeeListToolbarProps = {
  cafeNameDraft: string;
  hasActiveFilter: boolean;
  onCafeNameDraftChange: (value: string) => void;
  onApply: () => void;
  onClear: () => void;
  addEmployeeHref: string;
};

export function EmployeeListToolbar({
  cafeNameDraft,
  hasActiveFilter,
  onCafeNameDraftChange,
  onApply,
  onClear,
  addEmployeeHref,
}: EmployeeListToolbarProps) {
  return (
    <Card
      styles={{
        body: {
          background: "linear-gradient(180deg, rgba(20, 83, 45, 0.04), rgba(20, 83, 45, 0.01))",
        },
      }}
    >
      <Flex align="center" justify="space-between" gap={16} wrap>
        <Space direction="vertical" size={4}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            Employee directory
          </Typography.Title>
          <Typography.Text type="secondary">
            Filter the loaded employee rows by cafe name while keeping any backend cafe deep link explicit.
          </Typography.Text>
        </Space>
        <Button href={addEmployeeHref} type="primary" icon={<PlusOutlined />} size="large">
          Add Employee
        </Button>
      </Flex>
      <Flex gap={12} wrap style={{ marginTop: 20 }}>
        <Input
          allowClear
          aria-label="Cafe name filter"
          placeholder="Filter by cafe name"
          prefix={<SearchOutlined />}
          size="large"
          value={cafeNameDraft}
          onChange={(event) => onCafeNameDraftChange(event.target.value)}
          onPressEnter={onApply}
          style={{ flex: "1 1 320px", minWidth: 260 }}
        />
        <Button type="primary" size="large" onClick={onApply}>
          Apply
        </Button>
        <Button size="large" onClick={onClear} disabled={!hasActiveFilter && cafeNameDraft.length === 0}>
          Clear
        </Button>
      </Flex>
    </Card>
  );
}

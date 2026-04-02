import { ApartmentOutlined, TeamOutlined } from "@ant-design/icons";
import { Layout, Menu, Space, Typography } from "antd";
import { NavLink, Outlet, useLocation } from "react-router-dom";

const { Header, Content } = Layout;

const navItems = [
  {
    key: "/cafes",
    icon: <ApartmentOutlined />,
    label: <NavLink to="/cafes">Cafes</NavLink>,
  },
  {
    key: "/employees",
    icon: <TeamOutlined />,
    label: <NavLink to="/employees">Employees</NavLink>,
  },
];

export function AppShell() {
  const location = useLocation();
  const selectedKey = location.pathname.startsWith("/employees") ? "/employees" : "/cafes";

  return (
    <Layout className="app-shell">
      <Header className="app-shell__header">
        <Space className="app-shell__brand" direction="vertical" size={0}>
          <Typography.Title className="app-shell__title" level={3}>
            Cafe Manager
          </Typography.Title>
          <Typography.Text className="app-shell__subtitle">
            A warmer, simpler workspace for cafe and employee operations, with backend-owned filtering, assignment semantics, and direct management flows.
          </Typography.Text>
        </Space>
      </Header>
      <Layout>
        <Menu
          className="app-shell__menu"
          mode="horizontal"
          selectedKeys={[selectedKey]}
          items={navItems}
        />
        <Content className="app-shell__content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

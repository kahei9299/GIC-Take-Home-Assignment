import { ApartmentOutlined, TeamOutlined } from "@ant-design/icons";
import { Layout, Menu, Space, Tag, Typography } from "antd";
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
    <Layout style={{ minHeight: "100vh" }}>
      <Header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
          background: "linear-gradient(135deg, #16351f, #245132)",
          paddingInline: 24,
        }}
      >
        <Space direction="vertical" size={0}>
          <Typography.Title level={3} style={{ color: "#f8fff6", margin: 0 }}>
            GIC Cafe Manager
          </Typography.Title>
          <Typography.Text style={{ color: "rgba(248, 255, 246, 0.78)" }}>
            Frontend foundation for the hosted backend contract
          </Typography.Text>
        </Space>
        <Tag color="green-inverse" bordered={false}>
          Increment 13
        </Tag>
      </Header>
      <Layout>
        <Menu
          mode="horizontal"
          selectedKeys={[selectedKey]}
          items={navItems}
          style={{
            paddingInline: 24,
            borderBottom: "1px solid #dfe8dc",
            background: "#fcfdfb",
          }}
        />
        <Content style={{ padding: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

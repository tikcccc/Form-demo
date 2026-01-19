import React from 'react';
import { Layout, Menu, Select, Space, Typography } from '@arco-design/web-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from '../store/AppContext.jsx';

const { Header } = Layout;

export default function AppHeader() {
  const { state, actions } = useAppContext();
  const location = useLocation();
  const navigate = useNavigate();
  const selectedKey = location.pathname.startsWith('/settings') ? 'settings' : 'workflows';

  return (
    <Header className="app-header">
      <Typography.Text className="brand">FlowForge</Typography.Text>
      <Menu
        mode="horizontal"
        selectedKeys={[selectedKey]}
        onClickMenuItem={(key) => navigate(`/${key}`)}
      >
        <Menu.Item key="workflows">Workflows</Menu.Item>
        <Menu.Item key="settings">Settings</Menu.Item>
      </Menu>
      <div className="header-right">
        <Space>
          <Select
            size="small"
            value={state.currentProjectId}
            onChange={actions.setProject}
            options={state.projects.map((project) => ({
              value: project.id,
              label: project.name,
            }))}
          />
          <Select
            size="small"
            value={state.currentRoleId}
            onChange={actions.setRole}
            options={state.roles.map((role) => ({
              value: role.id,
              label: role.label,
            }))}
          />
        </Space>
      </div>
    </Header>
  );
}

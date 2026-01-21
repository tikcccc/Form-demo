import React, { useMemo, useState } from 'react';
import {
  Button,
  Form,
  Input,
  Layout,
  Menu,
  Message,
  Modal,
  Select,
  Space,
  Typography,
} from '@arco-design/web-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from '../store/AppContext.jsx';

const { Header } = Layout;

export default function AppHeader() {
  const { state, actions } = useAppContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const selectedKey = location.pathname.startsWith('/settings') ? 'settings' : 'workflows';
  const roleOptions = useMemo(
    () =>
      state.roles.map((role) => ({
        value: role.id,
        label: role.label,
      })),
    [state.roles]
  );
  const groupHints = useMemo(
    () => Array.from(new Set(state.roles.map((role) => role.label))),
    [state.roles]
  );

  const openRoleModal = () => {
    setNewGroupName('');
    setRoleModalVisible(true);
  };

  const handleCreateRole = () => {
    const groupName = newGroupName.trim();
    if (!groupName) {
      Message.warning('Role group is required.');
      return;
    }
    const labelExists = state.roles.some(
      (role) => role.label.toLowerCase() === groupName.toLowerCase()
    );
    if (labelExists) {
      Message.error('Role group already exists.');
      return;
    }
    actions.addRole({ label: groupName });
    setRoleModalVisible(false);
  };

  return (
    <>
      <Header className="app-header">
        <Typography.Text className="brand">Eagle Eye</Typography.Text>
        <Menu
          mode="horizontal"
          selectedKeys={[selectedKey]}
          onClickMenuItem={(key) => navigate(`/${key}`)}
        >
          <Menu.Item key="workflows">Forms</Menu.Item>
          {state.currentRoleId === 'project-admin' && <Menu.Item key="settings">Settings</Menu.Item>}
        </Menu>
        <div className="header-right">
          <Space size={8} className="role-switcher">
            <Typography.Text className="muted">Role Group</Typography.Text>
            <Select
              size="small"
              value={state.currentRoleId}
              onChange={actions.setRole}
              options={roleOptions}
              showSearch
            />
            <Button size="mini" type="text" onClick={openRoleModal}>
              New Group
            </Button>
          </Space>
        </div>
      </Header>
      <Modal
        visible={roleModalVisible}
        title="Add Group"
        okText="Add Group"
        onOk={handleCreateRole}
        onCancel={() => setRoleModalVisible(false)}
      >
        <Form layout="vertical">
          <Form.Item label="Role Group" required>
            <Input
              placeholder="e.g. Contractor"
              value={newGroupName}
              onChange={setNewGroupName}
            />
          </Form.Item>
          {groupHints.length > 0 ? (
            <Typography.Text className="muted">
              Existing groups: {groupHints.join(', ')}
            </Typography.Text>
          ) : null}
        </Form>
      </Modal>
    </>
  );
}

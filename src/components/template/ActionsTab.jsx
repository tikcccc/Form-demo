import React, { useState } from 'react';
import {
  Button,
  Drawer,
  Form,
  Input,
  InputNumber,
  Message,
  Select,
  Space,
  Switch,
  Table,
} from '@arco-design/web-react';
import { useAppContext } from '../../store/AppContext.jsx';

const statusOptions = ['Approved', 'Rejected', 'AIP', 'For Info'];

export default function ActionsTab({ template }) {
  const { state, actions } = useAppContext();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editingAction, setEditingAction] = useState(null);
  const [formState, setFormState] = useState({
    label: '',
    allowedRoles: [],
    toCandidateGroups: [],
    dueDays: 0,
    lastStep: false,
    requiresAttachmentStatus: false,
    closeInstance: false,
    statusSet: [],
  });

  const openDrawer = (action) => {
    setEditingAction(action);
    setFormState({
      label: action.label,
      allowedRoles: action.allowedRoles,
      toCandidateGroups: action.toCandidateGroups,
      dueDays: action.dueDays || 0,
      lastStep: Boolean(action.lastStep),
      requiresAttachmentStatus: Boolean(action.requiresAttachmentStatus),
      closeInstance: Boolean(action.closeInstance),
      statusSet: action.statusSet || [],
    });
    setDrawerVisible(true);
  };

  const handleSave = () => {
    if (!formState.label.trim()) {
      Message.warning('Action label is required.');
      return;
    }
    if (formState.allowedRoles.length === 0) {
      Message.warning('Select at least one role.');
      return;
    }
    if (formState.toCandidateGroups.length === 0) {
      Message.warning('Select at least one recipient group.');
      return;
    }
    const nextAction = {
      ...editingAction,
      label: formState.label.trim(),
      allowedRoles: formState.allowedRoles,
      toCandidateGroups: formState.toCandidateGroups,
      dueDays: formState.dueDays || 0,
      lastStep: formState.lastStep,
      requiresAttachmentStatus: formState.requiresAttachmentStatus,
      closeInstance: formState.closeInstance,
      statusSet: formState.requiresAttachmentStatus ? formState.statusSet : [],
    };
    actions.updateTemplate(template.id, (current) => {
      const nextActions = current.actions.map((action) =>
        action.id === editingAction.id ? nextAction : action
      );
      return { ...current, actions: nextActions };
    });
    setDrawerVisible(false);
  };

  const columns = [
    { title: 'Action', dataIndex: 'label' },
    {
      title: 'Allowed Roles',
      render: (_, record) => record.allowedRoles.join(', '),
    },
    {
      title: 'To Groups',
      render: (_, record) => record.toCandidateGroups.join(', '),
    },
    {
      title: 'Due Days',
      dataIndex: 'dueDays',
    },
    {
      title: 'Last Step',
      render: (_, record) => (record.lastStep ? 'Yes' : 'No'),
    },
    {
      title: 'Attachment Status',
      render: (_, record) => (record.requiresAttachmentStatus ? 'Yes' : 'No'),
    },
    {
      title: 'Close',
      render: (_, record) => (record.closeInstance ? 'Yes' : 'No'),
    },
    {
      title: 'Actions',
      render: (_, record) => (
        <Button size="mini" onClick={() => openDrawer(record)}>
          Edit
        </Button>
      ),
    },
  ];

  const roleOptions = state.roles.map((role) => ({ value: role.id, label: role.label }));
  const groupOptions = Array.from(new Set(state.roles.map((role) => role.group))).map(
    (group) => ({ value: group, label: group })
  );

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Table rowKey="id" columns={columns} data={template.actions} pagination={false} />
      <Drawer
        width={460}
        visible={drawerVisible}
        title={editingAction ? `Edit ${editingAction.label}` : 'Edit Action'}
        onOk={handleSave}
        onCancel={() => setDrawerVisible(false)}
        okText="Save"
      >
        <Form layout="vertical">
          <Form.Item label="Label" required>
            <Input
              value={formState.label}
              onChange={(value) => setFormState({ ...formState, label: value })}
            />
          </Form.Item>
          <Form.Item label="Allowed Roles" required>
            <Select
              mode="multiple"
              options={roleOptions}
              value={formState.allowedRoles}
              onChange={(value) => setFormState({ ...formState, allowedRoles: value })}
            />
          </Form.Item>
          <Form.Item label="To Candidate Groups" required>
            <Select
              mode="multiple"
              options={groupOptions}
              value={formState.toCandidateGroups}
              onChange={(value) => setFormState({ ...formState, toCandidateGroups: value })}
            />
          </Form.Item>
          <Form.Item label="Due Days">
            <InputNumber
              min={0}
              value={formState.dueDays}
              onChange={(value) => setFormState({ ...formState, dueDays: value })}
            />
          </Form.Item>
          <Form.Item label="Last Step">
            <Switch
              checked={formState.lastStep}
              onChange={(value) => setFormState({ ...formState, lastStep: value })}
            />
          </Form.Item>
          <Form.Item label="Requires Attachment Status">
            <Switch
              checked={formState.requiresAttachmentStatus}
              onChange={(value) =>
                setFormState({
                  ...formState,
                  requiresAttachmentStatus: value,
                  statusSet: value ? formState.statusSet : [],
                })
              }
            />
          </Form.Item>
          {formState.requiresAttachmentStatus && (
            <Form.Item label="Status Set">
              <Select
                mode="multiple"
                options={statusOptions.map((status) => ({ value: status, label: status }))}
                value={formState.statusSet}
                onChange={(value) => setFormState({ ...formState, statusSet: value })}
              />
            </Form.Item>
          )}
          <Form.Item label="Close Instance">
            <Switch
              checked={formState.closeInstance}
              onChange={(value) => setFormState({ ...formState, closeInstance: value })}
            />
          </Form.Item>
        </Form>
      </Drawer>
    </Space>
  );
}

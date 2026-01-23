import React, { useState } from 'react';
import {
  Button,
  Card,
  Drawer,
  Form,
  Input,
  InputNumber,
  Message,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from '@arco-design/web-react';
import { useAppContext } from '../../store/AppContext.jsx';
import { getRoleGroup } from '../../utils/workflow.js';

export default function ActionsTab({ template }) {
  const { state, actions } = useAppContext();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editingAction, setEditingAction] = useState(null);
  const [isNewAction, setIsNewAction] = useState(false);
  const [draggingActionId, setDraggingActionId] = useState('');
  const [dragOverActionId, setDragOverActionId] = useState('');
  const [formState, setFormState] = useState({
    label: '',
    allowedRoles: [],
    toCandidateGroups: [],
    ccRoleIds: [],
    dueDays: 0,
    lastStep: false,
    allowDelegate: false,
    requiresAttachmentStatus: false,
    closeInstance: false,
    statusSet: [],
  });
  const fallbackStatusOptions = ['Approved', 'Rejected', 'AIP', 'For Info'];
  const statusOptions =
    state.attachmentStatusOptions && state.attachmentStatusOptions.length > 0
      ? state.attachmentStatusOptions
      : fallbackStatusOptions;
  const statusSetOptions = Array.from(new Set([...statusOptions, ...formState.statusSet]));

  const openDrawer = (action) => {
    if (action) {
      setEditingAction(action);
      setIsNewAction(false);
      setFormState({
        label: action.label,
        allowedRoles: action.allowedRoles,
        toCandidateGroups: action.toCandidateGroups,
        ccRoleIds: action.ccRoleIds || [],
        dueDays: action.dueDays || 0,
        lastStep: Boolean(action.lastStep),
        allowDelegate: Boolean(action.allowDelegate),
        requiresAttachmentStatus: Boolean(action.requiresAttachmentStatus),
        closeInstance: Boolean(action.closeInstance),
        statusSet: action.statusSet || [],
      });
    } else {
      setEditingAction(null);
      setIsNewAction(true);
      setFormState({
        label: '',
        allowedRoles: [],
        toCandidateGroups: [],
        ccRoleIds: [],
        dueDays: 0,
        lastStep: false,
        allowDelegate: false,
        requiresAttachmentStatus: false,
        closeInstance: false,
        statusSet: [],
      });
    }
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
    const nextActionIds = editingAction?.nextActionIds || [];
    const isStart = Boolean(editingAction?.isStart);
    const lastStep = formState.closeInstance ? false : formState.lastStep;
    const allowDelegate = lastStep ? formState.allowDelegate : false;
    const nextAction = {
      ...(editingAction || {}),
      id: editingAction?.id || `action-${Date.now()}`,
      label: formState.label.trim(),
      allowedRoles: formState.allowedRoles,
      toCandidateGroups: formState.toCandidateGroups,
      ccRoleIds: formState.ccRoleIds,
      dueDays: formState.dueDays || 0,
      lastStep,
      allowDelegate,
      requiresAttachmentStatus: formState.requiresAttachmentStatus,
      closeInstance: formState.closeInstance,
      statusSet: formState.requiresAttachmentStatus ? formState.statusSet : [],
      nextActionIds,
      isStart,
    };
    actions.updateTemplate(template.id, (current) => {
      const nextActions = editingAction
        ? current.actions.map((action) => (action.id === editingAction.id ? nextAction : action))
        : [...current.actions, nextAction];
      return { ...current, actions: nextActions };
    });
    setDrawerVisible(false);
  };

  const handleDelete = (actionId) => {
    actions.updateTemplate(template.id, (current) => ({
      ...current,
      actions: current.actions
        .filter((action) => action.id !== actionId)
        .map((action) =>
          action.nextActionIds
            ? { ...action, nextActionIds: action.nextActionIds.filter((id) => id !== actionId) }
            : action
        ),
    }));
  };

  const actionOptions = template.actions.map((action) => ({
    value: action.id,
    label: action.label,
  }));

  const updateActionFlow = (actionId, updates) => {
    actions.updateTemplate(template.id, (current) => ({
      ...current,
      actions: current.actions.map((action) =>
        action.id === actionId ? { ...action, ...updates } : action
      ),
    }));
  };

  const setStartAction = (actionId, value) => {
    actions.updateTemplate(template.id, (current) => ({
      ...current,
      actions: current.actions.map((action) => {
        if (action.id === actionId) {
          return { ...action, isStart: value };
        }
        return value ? { ...action, isStart: false } : action;
      }),
    }));
  };

  const toggleFlow = (value) => {
    actions.updateTemplate(template.id, (current) => ({
      ...current,
      actionFlowEnabled: value,
    }));
  };

  const flowEnabled = Boolean(template.actionFlowEnabled);

  const moveAction = (sourceId, targetId) => {
    if (!sourceId || !targetId || sourceId === targetId) {
      return;
    }
    actions.updateTemplate(template.id, (current) => {
      const nextActions = [...current.actions];
      const sourceIndex = nextActions.findIndex((action) => action.id === sourceId);
      const targetIndex = nextActions.findIndex((action) => action.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0) {
        return current;
      }
      const [moved] = nextActions.splice(sourceIndex, 1);
      const insertIndex = targetIndex;
      nextActions.splice(insertIndex, 0, moved);
      return { ...current, actions: nextActions };
    });
  };

  const handleDragStart = (actionId) => (event) => {
    setDraggingActionId(actionId);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', actionId);
  };

  const handleDragOver = (actionId) => (event) => {
    event.preventDefault();
    if (dragOverActionId !== actionId) {
      setDragOverActionId(actionId);
    }
    event.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (actionId) => (event) => {
    event.preventDefault();
    const sourceId = draggingActionId || event.dataTransfer.getData('text/plain');
    if (sourceId && sourceId !== actionId) {
      moveAction(sourceId, actionId);
    }
    setDraggingActionId('');
    setDragOverActionId('');
  };

  const handleDragEnd = () => {
    setDraggingActionId('');
    setDragOverActionId('');
  };

  const columns = [
    {
      title: 'Order',
      width: 72,
      render: (_, record) => (
        <Typography.Text
          className="muted"
          draggable
          onDragStart={handleDragStart(record.id)}
          onDragEnd={handleDragEnd}
          style={{ cursor: 'grab' }}
        >
          Drag
        </Typography.Text>
      ),
    },
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
      title: 'CC Roles',
      render: (_, record) => (record.ccRoleIds && record.ccRoleIds.length > 0
        ? record.ccRoleIds.join(', ')
        : '—'),
    },
    {
      title: 'Due Days',
      dataIndex: 'dueDays',
    },
    {
      title: 'Require Reply',
      render: (_, record) => (record.lastStep ? 'Yes' : 'No'),
    },
    {
      title: 'Allow Delegate',
      render: (_, record) => (record.allowDelegate ? 'Yes' : 'No'),
    },
    {
      title: 'Attachment Status',
      render: (_, record) => (record.requiresAttachmentStatus ? 'Yes' : 'No'),
    },
    {
      title: 'Close Form',
      render: (_, record) => (record.closeInstance ? 'Yes' : 'No'),
    },
    {
      title: 'Actions',
      render: (_, record) => (
        <Space>
          <Button size="mini" onClick={() => openDrawer(record)}>
            Edit
          </Button>
          <Popconfirm
            title="Delete this action?"
            okText="Delete"
            cancelText="Cancel"
            onOk={() => handleDelete(record.id)}
          >
            <Button size="mini" status="danger">
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const roleOptions = state.roles.map((role) => ({ value: role.id, label: role.label }));
  const groupOptions = Array.from(new Set(state.roles.map((role) => getRoleGroup(role)))).map(
    (group) => ({ value: group, label: group })
  );

  const rowProps = (record) => {
    const isDropTarget =
      dragOverActionId === record.id && draggingActionId && draggingActionId !== record.id;
    return {
      onDragOver: handleDragOver(record.id),
      onDrop: handleDrop(record.id),
      style: isDropTarget ? { outline: '1px dashed #94a3b8' } : undefined,
    };
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Button type="primary" onClick={() => openDrawer(null)}>
        Add Action
      </Button>
      <Table
        rowKey="id"
        columns={columns}
        data={template.actions}
        pagination={false}
        onRow={rowProps}
      />
      <Card className="panel-card" title="Flow" bordered={false}>
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Space>
            <Switch checked={flowEnabled} onChange={toggleFlow} />
            <Typography.Text>Enable action flow constraints</Typography.Text>
          </Space>
          {!flowEnabled ? (
            <Typography.Text className="muted">
              Flow mapping is disabled. The current action logic remains unchanged.
            </Typography.Text>
          ) : template.actions.length === 0 ? (
            <Typography.Text className="muted">Add actions to configure the flow.</Typography.Text>
          ) : (
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              {template.actions.map((action) => {
                const nextOptions = actionOptions.filter((option) => option.value !== action.id);
                const rawNextIds = action.nextActionIds || [];
                const validNextIds = rawNextIds.filter(
                  (id) => id !== action.id && nextOptions.some((option) => option.value === id)
                );
                const canConfigure = action.lastStep && !action.closeInstance;
                const disabled = !canConfigure || nextOptions.length === 0;
                const isDropTarget =
                  dragOverActionId === action.id &&
                  draggingActionId &&
                  draggingActionId !== action.id;

                return (
                  <Card
                    key={action.id}
                    bordered
                    title={action.label}
                    extra={
                      <Typography.Text
                        className="muted"
                        draggable
                        onDragStart={handleDragStart(action.id)}
                        onDragEnd={handleDragEnd}
                      >
                        Drag
                      </Typography.Text>
                    }
                    onDragOver={handleDragOver(action.id)}
                    onDrop={handleDrop(action.id)}
                    style={isDropTarget ? { outline: '1px dashed #94a3b8' } : undefined}
                  >
                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                      <Space wrap>
                        <Typography.Text className="muted">Roles</Typography.Text>
                        {action.allowedRoles?.length
                          ? action.allowedRoles.map((role) => <Tag key={role}>{role}</Tag>)
                          : <Tag>—</Tag>}
                      </Space>
                      <Space wrap>
                        <Typography.Text className="muted">To</Typography.Text>
                        {action.toCandidateGroups?.length
                          ? action.toCandidateGroups.map((group) => <Tag key={group}>{group}</Tag>)
                          : <Tag>—</Tag>}
                      </Space>
                      <Space wrap>
                        <Typography.Text className="muted">CC</Typography.Text>
                        {action.ccRoleIds?.length
                          ? action.ccRoleIds.map((role) => <Tag key={role}>{role}</Tag>)
                          : <Tag>—</Tag>}
                      </Space>
                      <Space wrap>
                        <Tag color={action.lastStep ? 'blue' : undefined}>
                          Require Reply: {action.lastStep ? 'Yes' : 'No'}
                        </Tag>
                        <Tag color={action.closeInstance ? 'red' : undefined}>
                          Close Form: {action.closeInstance ? 'Yes' : 'No'}
                        </Tag>
                        {action.requiresAttachmentStatus ? (
                          <Tag color="gold">Attachment Status Required</Tag>
                        ) : null}
                      </Space>
                      {action.closeInstance ? (
                        <Typography.Text className="muted">
                          Close Form disables Require Reply.
                        </Typography.Text>
                      ) : null}
                      <Space>
                        <Switch
                          checked={Boolean(action.isStart)}
                          onChange={(value) => setStartAction(action.id, value)}
                        />
                        <Typography.Text>Start action</Typography.Text>
                      </Space>
                      <Select
                        mode="multiple"
                        placeholder={disabled ? 'No next actions available' : 'Select next actions'}
                        options={nextOptions}
                        value={validNextIds}
                        onChange={(value) => updateActionFlow(action.id, { nextActionIds: value })}
                        disabled={disabled}
                      />
                      {!canConfigure && (
                        <Typography.Text className="muted">
                          Next actions are only configurable when Require Reply is on and Close Form is off.
                        </Typography.Text>
                      )}
                    </Space>
                  </Card>
                );
              })}
            </Space>
          )}
        </Space>
      </Card>
      <Drawer
        width={460}
        visible={drawerVisible}
        title={isNewAction ? 'Add Action' : `Edit ${editingAction?.label || 'Action'}`}
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
          <Form.Item label="CC Roles">
            <Select
              mode="multiple"
              options={roleOptions}
              value={formState.ccRoleIds}
              onChange={(value) => setFormState({ ...formState, ccRoleIds: value })}
            />
          </Form.Item>
          <Form.Item label="Due Days">
            <InputNumber
              min={0}
              value={formState.dueDays}
              onChange={(value) => setFormState({ ...formState, dueDays: value })}
            />
          </Form.Item>
          <Form.Item label="Require Reply">
            <Switch
              checked={formState.lastStep}
              onChange={(value) =>
                setFormState({
                  ...formState,
                  lastStep: value,
                  closeInstance: value ? false : formState.closeInstance,
                })
              }
            />
          </Form.Item>
          <Form.Item label="Allow Delegate">
            <Switch
              checked={formState.allowDelegate}
              onChange={(value) =>
                setFormState({
                  ...formState,
                  allowDelegate: value,
                })
              }
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
                options={statusSetOptions.map((status) => ({ value: status, label: status }))}
                value={formState.statusSet}
                onChange={(value) => setFormState({ ...formState, statusSet: value })}
              />
            </Form.Item>
          )}
          <Form.Item label="Close Form">
            <Switch
              checked={formState.closeInstance}
              onChange={(value) =>
                setFormState({
                  ...formState,
                  closeInstance: value,
                  lastStep: value ? false : formState.lastStep,
                })
              }
            />
          </Form.Item>
        </Form>
      </Drawer>
    </Space>
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Input,
  Popconfirm,
  Select,
  Space,
  Switch,
  Tabs,
  Typography,
} from '@arco-design/web-react';
import { useNavigate } from 'react-router-dom';
import CreateInstanceModal from '../components/CreateInstanceModal.jsx';
import WorkflowTable from '../components/WorkflowTable.jsx';
import { useAppContext } from '../store/AppContext.jsx';
import {
  canInitiateTemplate,
  canViewInstance,
  getTemplateById,
  isInbox,
  isOverdue,
  isProjectAdmin,
} from '../utils/workflow.js';
import { exportFormReportPdf } from '../utils/reportPdf.js';

const { TabPane } = Tabs;

export default function WorkflowsPage() {
  const { state, actions } = useAppContext();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [templateFilter, setTemplateFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [selectedInstanceId, setSelectedInstanceId] = useState('');
  const isAdmin = isProjectAdmin(state.currentRoleId);
  const canCreate = state.templates.some(
    (template) => template.published && canInitiateTemplate(template, state.currentRoleId)
  );

  const filteredInstances = useMemo(() => {
    let data = state.instances.filter((instance) =>
      canViewInstance(instance, state.currentRoleId, state.roles)
    );
    if (activeTab === 'created') {
      data = data.filter((instance) => instance.createdBy === state.currentRoleId);
    }
    if (activeTab === 'inbox') {
      data = data.filter((instance) => isInbox(instance, state.currentRoleId, state.roles));
    }
    if (activeTab === 'closed') {
      data = data.filter((instance) => instance.status === 'Closed');
    }
    if (templateFilter !== 'all') {
      data = data.filter((instance) => instance.templateId === templateFilter);
    }
    if (statusFilter !== 'all') {
      data = data.filter((instance) => instance.status === statusFilter);
    }
    if (overdueOnly) {
      data = data.filter((instance) => isOverdue(instance));
    }
    if (search.trim()) {
      const query = search.trim().toLowerCase();
      data = data.filter(
        (instance) =>
          instance.transmittalNo.toLowerCase().includes(query) ||
          instance.title.toLowerCase().includes(query)
      );
    }
    return data;
  }, [
    activeTab,
    overdueOnly,
    search,
    state.currentRoleId,
    state.instances,
    state.roles,
    statusFilter,
    templateFilter,
  ]);

  useEffect(() => {
    if (!selectedInstanceId) {
      return;
    }
    if (!filteredInstances.some((instance) => instance.id === selectedInstanceId)) {
      setSelectedInstanceId('');
    }
  }, [filteredInstances, selectedInstanceId]);

  const selectedInstance = useMemo(
    () => filteredInstances.find((instance) => instance.id === selectedInstanceId) || null,
    [filteredInstances, selectedInstanceId]
  );
  const selectedTemplate = selectedInstance
    ? getTemplateById(state.templates, selectedInstance.templateId)
    : null;
  const canExport = Boolean(selectedInstance && selectedTemplate);

  const templateOptions = [
    { value: 'all', label: 'All Templates' },
    ...state.templates.map((template) => ({
      value: template.id,
      label: template.name,
    })),
  ];

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'Draft', label: 'Draft' },
    { value: 'Sent', label: 'Sent' },
    { value: 'Received', label: 'Received' },
    { value: 'Closed', label: 'Closed' },
  ];

  const handleCreate = (payload) => {
    const newId = actions.createInstance(payload);
    if (newId) {
      navigate(`/workflows/${newId}`);
    }
  };

  const handleExportPdf = () => {
    if (!selectedInstance || !selectedTemplate) {
      return;
    }
    exportFormReportPdf({
      instance: selectedInstance,
      template: selectedTemplate,
      commonFields: state.commonFields || [],
      roles: state.roles,
    });
  };

  const handleDeleteSelected = () => {
    if (!selectedInstanceId) {
      return;
    }
    actions.deleteInstance(selectedInstanceId);
    setSelectedInstanceId('');
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card className="page-card">
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Typography.Title heading={4} style={{ margin: 0 }}>
              Forms
            </Typography.Title>
            <Space>
              {isAdmin && <Button onClick={() => navigate('/settings')}>Settings</Button>}
              <Button
                type="primary"
                onClick={() => setCreateModalVisible(true)}
                disabled={!canCreate}
              >
                Create Form
              </Button>
            </Space>
          </Space>
          <Alert
            type="warning"
            showIcon
            content="Data is stored in web memory. Refreshing resets role groups (including custom), templates, and forms."
          />
          <Tabs activeTab={activeTab} onChange={setActiveTab} type="rounded">
            <TabPane key="all" title="All" />
            <TabPane key="created" title="My Created" />
            <TabPane key="inbox" title="My Inbox" />
            <TabPane key="closed" title="Closed" />
          </Tabs>
          <div className="filter-bar">
            <div className="filter-main">
              <Input.Search
                placeholder="Search form no or title"
                value={search}
                onChange={setSearch}
                style={{ width: 240 }}
                allowClear
              />
              <Select
                options={templateOptions}
                value={templateFilter}
                onChange={setTemplateFilter}
              />
              <Select options={statusOptions} value={statusFilter} onChange={setStatusFilter} />
            </div>
            <Space className="filter-toggle">
              <Switch checked={overdueOnly} onChange={setOverdueOnly} />
              <Typography.Text className="muted">Overdue only</Typography.Text>
            </Space>
          </div>
        </Space>
      </Card>
      <Card className="page-card">
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Typography.Text className="muted">
              {selectedInstance
                ? `Selected: ${selectedInstance.transmittalNo}`
                : isAdmin
                  ? 'Select one form to export or delete.'
                  : 'Select one form to export.'}
            </Typography.Text>
            <Space>
              <Button
                disabled={!selectedInstanceId}
                onClick={() => setSelectedInstanceId('')}
              >
                Clear Selection
              </Button>
              {isAdmin
                ? selectedInstanceId
                  ? (
                    <Popconfirm
                      title="Delete this form?"
                      okText="Delete"
                      cancelText="Cancel"
                      onOk={handleDeleteSelected}
                    >
                      <Button status="danger">Delete</Button>
                    </Popconfirm>
                    )
                  : (
                    <Button status="danger" disabled>
                      Delete
                    </Button>
                    )
                : null}
              <Button type="primary" disabled={!canExport} onClick={handleExportPdf}>
                Export PDF
              </Button>
            </Space>
          </Space>
          <WorkflowTable
            instances={filteredInstances}
            templates={state.templates}
            roles={state.roles}
            currentRoleId={state.currentRoleId}
            selectedRowId={selectedInstanceId}
            onSelectRow={setSelectedInstanceId}
            onSelect={(id) => navigate(`/workflows/${id}`)}
          />
        </Space>
      </Card>
      <CreateInstanceModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        templates={state.templates}
        onCreate={handleCreate}
      />
    </Space>
  );
}

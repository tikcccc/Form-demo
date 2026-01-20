import React, { useMemo, useState } from 'react';
import { Button, Card, Input, Select, Space, Switch, Tabs, Typography } from '@arco-design/web-react';
import { useNavigate } from 'react-router-dom';
import WorkflowTable from '../components/WorkflowTable.jsx';
import { useAppContext } from '../store/AppContext.jsx';
import { isInbox, isOverdue } from '../utils/workflow.js';

const { TabPane } = Tabs;

export default function WorkflowsPage() {
  const { state } = useAppContext();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [overdueOnly, setOverdueOnly] = useState(false);

  const filteredInstances = useMemo(() => {
    let data = [...state.instances];
    if (activeTab === 'created') {
      data = data.filter((instance) => instance.createdBy === state.currentRoleId);
    }
    if (activeTab === 'inbox') {
      data = data.filter((instance) => isInbox(instance, state.currentRoleId, state.roles));
    }
    if (activeTab === 'closed') {
      data = data.filter((instance) => instance.status === 'Closed');
    }
    if (typeFilter !== 'all') {
      data = data.filter((instance) => instance.typeId === typeFilter);
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
    typeFilter,
  ]);

  const typeOptions = [{ value: 'all', label: 'All Types' }, ...state.types.map((type) => ({
    value: type.id,
    label: type.name,
  }))];

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'Open', label: 'Open' },
    { value: 'Closed', label: 'Closed' },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card className="page-card">
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Typography.Title heading={4} style={{ margin: 0 }}>
              Workflows
            </Typography.Title>
            <Space>
              <Button onClick={() => navigate('/settings')}>Settings</Button>
              <Button type="primary" onClick={() => navigate('/launch')}>
                Create
              </Button>
            </Space>
          </Space>
          <Tabs activeTab={activeTab} onChange={setActiveTab} type="rounded">
            <TabPane key="all" title="All" />
            <TabPane key="created" title="My Created" />
            <TabPane key="inbox" title="My Inbox" />
            <TabPane key="closed" title="Closed" />
          </Tabs>
          <div className="filter-bar">
            <Input.Search
              placeholder="Search transmittal or title"
              value={search}
              onChange={setSearch}
              style={{ width: 240 }}
              allowClear
            />
            <Select options={typeOptions} value={typeFilter} onChange={setTypeFilter} />
            <Select options={statusOptions} value={statusFilter} onChange={setStatusFilter} />
            <Space>
              <Switch checked={overdueOnly} onChange={setOverdueOnly} />
              <Typography.Text className="muted">Overdue only</Typography.Text>
            </Space>
          </div>
        </Space>
      </Card>
      <Card className="page-card">
        <WorkflowTable
          instances={filteredInstances}
          types={state.types}
          roles={state.roles}
          currentRoleId={state.currentRoleId}
          onSelect={(id) => navigate(`/workflows/${id}`)}
        />
      </Card>
    </Space>
  );
}

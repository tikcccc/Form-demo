import React, { useMemo, useState } from 'react';
import { Button, Card, Input, Space, Table, Tag, Typography } from '@arco-design/web-react';
import { Navigate, useNavigate } from 'react-router-dom';
import CreateTemplateModal from '../components/CreateTemplateModal.jsx';
import { useAppContext } from '../store/AppContext.jsx';
import { isProjectAdmin } from '../utils/workflow.js';

export default function TemplatesPage() {
  const { state, actions } = useAppContext();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const isAdmin = isProjectAdmin(state.currentRoleId);

  if (!isAdmin) {
    return <Navigate to="/workflows" replace />;
  }

  const filteredTemplates = useMemo(() => {
    let data = [...state.templates];
    if (search.trim()) {
      const query = search.trim().toLowerCase();
      data = data.filter(
        (template) =>
          template.name.toLowerCase().includes(query) ||
          template.id.toLowerCase().includes(query)
      );
    }
    return data;
  }, [state.templates, search]);

  const columns = [
    {
      title: 'Type Name',
      dataIndex: 'name',
    },
    {
      title: 'Status',
      dataIndex: 'published',
      render: (published) => (published ? <Tag color="green">Published</Tag> : <Tag>Draft</Tag>),
    },
    {
      title: 'Fields',
      render: (_, record) => record.schema.length,
    },
    {
      title: 'Actions',
      render: (_, record) => record.actions.length,
    },
    {
      title: 'Manage',
      render: (_, record) => (
        <Space>
          <Button
            size="mini"
            onClick={() => navigate(`/settings/templates/${record.id}`)}
          >
            Edit
          </Button>
          <Button size="mini" onClick={() => actions.duplicateTemplate(record.id)}>
            Duplicate
          </Button>
          <Button size="mini" disabled>
            Archive
          </Button>
        </Space>
      ),
    },
  ];

  const handleCreate = ({ sourceTemplateId, name }) => {
    const newId = actions.createTemplate({ sourceTemplateId, name });
    navigate(`/settings/templates/${newId}`);
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card className="page-card">
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space direction="vertical" size={4}>
            <Typography.Text className="muted">Settings</Typography.Text>
            <Typography.Title heading={4} style={{ margin: 0 }}>
              Templates
            </Typography.Title>
          </Space>
          <Space>
            <Button onClick={() => navigate('/workflows')}>Back to Workflows</Button>
            <Button onClick={actions.resetData}>Reset to Starter Pack</Button>
            <Button type="primary" onClick={() => setModalVisible(true)}>
              Create Type
            </Button>
          </Space>
        </Space>
      </Card>
      <Card className="page-card">
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <div className="filter-bar">
            <Input.Search
              placeholder="Search type name or id"
              value={search}
              onChange={setSearch}
              style={{ width: 240 }}
              allowClear
            />
          </div>
          <Table rowKey="id" columns={columns} data={filteredTemplates} pagination={{ pageSize: 8 }} />
        </Space>
      </Card>
      <CreateTemplateModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        templates={state.templates}
        onCreate={handleCreate}
      />
    </Space>
  );
}

import React, { useMemo, useState } from 'react';
import { Button, Card, Input, Select, Space, Table, Tag, Typography } from '@arco-design/web-react';
import { useNavigate } from 'react-router-dom';
import CreateTemplateModal from '../components/CreateTemplateModal.jsx';
import { useAppContext } from '../store/AppContext.jsx';
import { getTypeById } from '../utils/workflow.js';

export default function TemplatesPage() {
  const { state, actions } = useAppContext();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [modalVisible, setModalVisible] = useState(false);

  const filteredTemplates = useMemo(() => {
    let data = [...state.templates];
    if (typeFilter !== 'all') {
      data = data.filter((template) => template.typeId === typeFilter);
    }
    if (search.trim()) {
      const query = search.trim().toLowerCase();
      data = data.filter(
        (template) =>
          template.name.toLowerCase().includes(query) ||
          template.id.toLowerCase().includes(query)
      );
    }
    return data;
  }, [search, state.templates, typeFilter]);

  const columns = [
    {
      title: 'Template Name',
      dataIndex: 'name',
    },
    {
      title: 'Type',
      dataIndex: 'typeId',
      render: (typeId) => getTypeById(state.types, typeId)?.name || typeId,
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
            onClick={() => navigate(`/settings/templates/${record.typeId}/${record.id}`)}
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

  const typeOptions = [
    { value: 'all', label: 'All Types' },
    ...state.types.map((type) => ({ value: type.id, label: type.name })),
  ];

  const handleCreate = ({ typeId, sourceTemplateId, name }) => {
    const newId = actions.createTemplate({ typeId, sourceTemplateId, name });
    navigate(`/settings/templates/${typeId}/${newId}`);
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
            <Button onClick={actions.resetData}>Reset to Starter Pack</Button>
            <Button type="primary" onClick={() => setModalVisible(true)}>
              Create Template
            </Button>
          </Space>
        </Space>
      </Card>
      <Card className="page-card">
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <div className="filter-bar">
            <Input.Search
              placeholder="Search template name or id"
              value={search}
              onChange={setSearch}
              style={{ width: 240 }}
              allowClear
            />
            <Select options={typeOptions} value={typeFilter} onChange={setTypeFilter} />
          </div>
          <Table rowKey="id" columns={columns} data={filteredTemplates} pagination={{ pageSize: 8 }} />
        </Space>
      </Card>
      <CreateTemplateModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        types={state.types}
        templates={state.templates}
        onCreate={handleCreate}
      />
    </Space>
  );
}

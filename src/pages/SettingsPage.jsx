import React from 'react';
import { Button, Card, Space, Table, Typography } from '@arco-design/web-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../store/AppContext.jsx';

export default function SettingsPage() {
  const { state, actions } = useAppContext();
  const navigate = useNavigate();

  const columns = [
    {
      title: 'Type',
      dataIndex: 'name',
    },
    {
      title: 'Templates',
      render: (_, record) => record.templateIds.length,
    },
    {
      title: 'Published',
      render: (_, record) => {
        const published = record.templateIds.filter((id) => {
          const template = state.templates.find((item) => item.id === id);
          return template?.published;
        });
        return published.length;
      },
    },
    {
      title: 'Actions',
      render: (_, record) => {
        const templateId = record.templateIds[0];
        return (
          <Space className="table-actions">
            <Button size="mini" onClick={() => navigate(`/settings/templates/${record.id}/${templateId}`)}>
              Edit
            </Button>
            <Button size="mini" onClick={() => actions.duplicateTemplate(templateId)}>
              Duplicate
            </Button>
            <Button size="mini" disabled>
              Archive
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card className="page-card">
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Typography.Title heading={4} style={{ margin: 0 }}>
            Settings
          </Typography.Title>
          <Space>
            <Button onClick={() => navigate('/settings/templates')}>Template Library</Button>
            <Button onClick={actions.resetData}>Reset to Starter Pack</Button>
          </Space>
        </Space>
      </Card>
      <Card className="page-card">
        <Table rowKey="id" columns={columns} data={state.types} pagination={false} />
      </Card>
    </Space>
  );
}

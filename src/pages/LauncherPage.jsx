import React, { useMemo, useState } from 'react';
import { Button, Card, Form, Input, Select, Space, Typography } from '@arco-design/web-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../store/AppContext.jsx';

export default function LauncherPage() {
  const { state, actions } = useAppContext();
  const navigate = useNavigate();
  const [typeId, setTypeId] = useState(state.types[0]?.id || '');
  const [title, setTitle] = useState('');

  const template = useMemo(() => {
    if (!typeId) {
      return null;
    }
    const type = state.types.find((item) => item.id === typeId);
    if (!type) {
      return null;
    }
    return state.templates.find((item) => item.id === type.templateIds[0]);
  }, [state.templates, state.types, typeId]);

  const typeOptions = state.types.map((type) => ({
    value: type.id,
    label: type.name,
  }));

  const handleCreate = () => {
    if (!typeId || !template || !template.published) {
      return;
    }
    const newId = actions.createInstance({
      typeId,
      templateId: template.id,
      title: title.trim(),
    });
    navigate(`/workflows/${newId}`);
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card className="page-card">
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space direction="vertical" size={4}>
            <Typography.Text className="muted">Runtime</Typography.Text>
            <Typography.Title heading={4} style={{ margin: 0 }}>
              Create Workflow
            </Typography.Title>
          </Space>
          <Button onClick={() => navigate('/workflows')}>Back to List</Button>
        </Space>
      </Card>
      <Card className="page-card">
        <Form layout="vertical" style={{ maxWidth: 520 }}>
          <Form.Item label="Type" required>
            <Select value={typeId} onChange={setTypeId} options={typeOptions} />
          </Form.Item>
          <Form.Item label="Template">
            <Input
              value={
                template
                  ? template.published
                    ? template.name
                    : `${template.name} (Unpublished)`
                  : 'No template'
              }
              disabled
            />
          </Form.Item>
          <Form.Item label="Title">
            <Input value={title} onChange={setTitle} placeholder="Optional" />
          </Form.Item>
          <Button type="primary" onClick={handleCreate} disabled={!template || !template.published}>
            Create
          </Button>
        </Form>
      </Card>
    </Space>
  );
}

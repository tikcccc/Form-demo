import React, { useEffect, useMemo, useState } from 'react';
import { Button, Card, Form, Input, Select, Space, Typography } from '@arco-design/web-react';
import { useNavigate } from 'react-router-dom';
import CommonFieldsForm from '../components/CommonFieldsForm.jsx';
import { useAppContext } from '../store/AppContext.jsx';
import { buildDefaultCommonData } from '../utils/workflow.js';

export default function LauncherPage() {
  const { state, actions } = useAppContext();
  const navigate = useNavigate();
  const [templateId, setTemplateId] = useState(state.templates[0]?.id || '');
  const [title, setTitle] = useState('');
  const commonFields = state.commonFields || [];
  const hasCommonTitle = commonFields.some((field) => field.key === 'title');
  const [commonValues, setCommonValues] = useState(() => buildDefaultCommonData(commonFields));

  const template = useMemo(() => {
    if (!templateId) {
      return null;
    }
    return state.templates.find((item) => item.id === templateId) || null;
  }, [state.templates, templateId]);

  const templateOptions = state.templates.map((item) => ({
    value: item.id,
    label: item.published ? item.name : `${item.name} (Unpublished)`,
  }));

  useEffect(() => {
    setCommonValues(buildDefaultCommonData(commonFields));
  }, [commonFields]);

  const handleCommonValueChange = (key, value) => {
    setCommonValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleCreate = () => {
    if (!templateId || !template || !template.published) {
      return;
    }
    const newId = actions.createInstance({
      templateId: template.id,
      title: title.trim(),
      commonFieldValues: commonValues,
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
            <Select value={templateId} onChange={setTemplateId} options={templateOptions} />
          </Form.Item>
          {!hasCommonTitle && (
            <Form.Item label="Title">
              <Input value={title} onChange={setTitle} placeholder="Optional" />
            </Form.Item>
          )}
          <Typography.Text className="muted">Shared Fields</Typography.Text>
          <CommonFieldsForm
            fields={commonFields}
            values={commonValues}
            onValueChange={handleCommonValueChange}
          />
          <Button type="primary" onClick={handleCreate} disabled={!template || !template.published}>
            Create
          </Button>
        </Form>
      </Card>
    </Space>
  );
}

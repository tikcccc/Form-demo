import React, { useEffect, useMemo, useState } from 'react';
import { Button, Card, Form, Input, Select, Space, Typography } from '@arco-design/web-react';
import { useNavigate } from 'react-router-dom';
import CommonFieldsForm from '../components/CommonFieldsForm.jsx';
import { useAppContext } from '../store/AppContext.jsx';
import { buildDefaultCommonData, canInitiateTemplate } from '../utils/workflow.js';

export default function LauncherPage() {
  const { state, actions } = useAppContext();
  const navigate = useNavigate();
  const [templateId, setTemplateId] = useState('');
  const [title, setTitle] = useState('');
  const commonFields = state.commonFields || [];
  const hasCommonTitle = commonFields.some((field) => field.key === 'title');
  const [commonValues, setCommonValues] = useState(() => buildDefaultCommonData(commonFields));

  const allowedTemplates = useMemo(
    () =>
      state.templates.filter(
        (item) => item.published && canInitiateTemplate(item, state.currentRoleId)
      ),
    [state.currentRoleId, state.templates]
  );
  const template = useMemo(() => {
    if (!templateId) {
      return null;
    }
    return allowedTemplates.find((item) => item.id === templateId) || null;
  }, [allowedTemplates, templateId]);

  const templateOptions = allowedTemplates.map((item) => ({
    value: item.id,
    label: item.name,
  }));

  useEffect(() => {
    setCommonValues(buildDefaultCommonData(commonFields));
  }, [commonFields]);

  useEffect(() => {
    if (allowedTemplates.length === 0) {
      setTemplateId('');
      return;
    }
    if (!allowedTemplates.some((item) => item.id === templateId)) {
      setTemplateId(allowedTemplates[0].id);
    }
  }, [allowedTemplates, templateId]);

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
    if (newId) {
      navigate(`/workflows/${newId}`);
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card className="page-card">
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space direction="vertical" size={4}>
            <Typography.Text className="muted">Runtime</Typography.Text>
            <Typography.Title heading={4} style={{ margin: 0 }}>
              Create Form
            </Typography.Title>
          </Space>
          <Button onClick={() => navigate('/workflows')}>Back to Forms</Button>
        </Space>
      </Card>
      <Card className="page-card">
        <Form layout="vertical" style={{ maxWidth: 520 }}>
          <Form.Item label="Template" required>
            <Select value={templateId} onChange={setTemplateId} options={templateOptions} />
          </Form.Item>
          {templateOptions.length === 0 && (
            <Typography.Text className="muted">
              No published templates available for your role.
            </Typography.Text>
          )}
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

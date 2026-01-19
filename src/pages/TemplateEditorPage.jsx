import React from 'react';
import { Button, Card, Space, Tabs, Typography } from '@arco-design/web-react';
import { useNavigate, useParams } from 'react-router-dom';
import SchemaTab from '../components/template/SchemaTab.jsx';
import LayoutTab from '../components/template/LayoutTab.jsx';
import ActionsTab from '../components/template/ActionsTab.jsx';
import PublishTab from '../components/template/PublishTab.jsx';
import { useAppContext } from '../store/AppContext.jsx';
import { getTemplateById, getTypeById } from '../utils/workflow.js';

const { TabPane } = Tabs;

export default function TemplateEditorPage() {
  const { state } = useAppContext();
  const { typeId, templateId } = useParams();
  const navigate = useNavigate();

  const template = getTemplateById(state.templates, templateId);
  const type = getTypeById(state.types, typeId);

  if (!template) {
    return <Typography.Text>Template not found.</Typography.Text>;
  }

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card className="page-card">
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space direction="vertical" size={4}>
            <Typography.Text className="muted">Template Editor</Typography.Text>
            <Typography.Title heading={4} style={{ margin: 0 }}>
              {type?.name || typeId} · {template.name}
            </Typography.Title>
          </Space>
          <Button onClick={() => navigate('/settings')}>Back to Settings</Button>
        </Space>
      </Card>
      <Card className="page-card">
        <Tabs defaultActiveTab="schema" type="rounded">
          <TabPane key="schema" title="Schema">
            <SchemaTab template={template} />
          </TabPane>
          <TabPane key="layout" title="Layout">
            <LayoutTab template={template} />
          </TabPane>
          <TabPane key="actions" title="Actions">
            <ActionsTab template={template} />
          </TabPane>
          <TabPane key="publish" title="Publish">
            <PublishTab template={template} />
          </TabPane>
        </Tabs>
      </Card>
    </Space>
  );
}

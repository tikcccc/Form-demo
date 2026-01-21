import React from 'react';
import { Layout } from '@arco-design/web-react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AppHeader from './components/AppHeader.jsx';
import WorkflowsPage from './pages/WorkflowsPage.jsx';
import WorkflowDetailPage from './pages/WorkflowDetailPage.jsx';
import TemplateEditorPage from './pages/TemplateEditorPage.jsx';
import TemplatesPage from './pages/TemplatesPage.jsx';

const { Content } = Layout;

export default function App() {
  return (
    <Layout className="app-layout">
      <AppHeader />
      <Content className="app-content">
        <Routes>
          <Route path="/" element={<Navigate to="/workflows" replace />} />
          <Route path="/workflows" element={<WorkflowsPage />} />
          <Route path="/workflows/:instanceId" element={<WorkflowDetailPage />} />
          <Route path="/settings" element={<TemplatesPage />} />
          <Route path="/settings/templates" element={<Navigate to="/settings" replace />} />
          <Route path="/settings/templates/:templateId" element={<TemplateEditorPage />} />
          <Route path="*" element={<Navigate to="/workflows" replace />} />
        </Routes>
      </Content>
    </Layout>
  );
}

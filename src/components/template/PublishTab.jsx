import React from 'react';
import { Alert, Space, Switch, Typography } from '@arco-design/web-react';
import { useAppContext } from '../../store/AppContext.jsx';
import { getPublishIssues } from '../../utils/workflow.js';

export default function PublishTab({ template }) {
  const { actions } = useAppContext();
  const issues = getPublishIssues(template);
  const canPublish = issues.length === 0;

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Space>
        <Switch
          checked={template.published}
          disabled={!canPublish}
          onChange={(value) =>
            actions.updateTemplate(template.id, (current) => ({ ...current, published: value }))
          }
        />
        <Typography.Text>{template.published ? 'Published' : 'Unpublished'}</Typography.Text>
      </Space>
      {canPublish ? (
        <Alert type="success" content="All checks passed. Ready to publish." />
      ) : (
        <Alert
          type="warning"
          title="Publish checks"
          content={
            <Space direction="vertical" size={4}>
              {issues.map((issue) => (
                <Typography.Text key={issue}>- {issue}</Typography.Text>
              ))}
            </Space>
          }
        />
      )}
    </Space>
  );
}

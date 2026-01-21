import React from 'react';
import { Alert, Select, Space, Switch, Typography } from '@arco-design/web-react';
import { useAppContext } from '../../store/AppContext.jsx';
import { getPublishIssues } from '../../utils/workflow.js';

export default function PublishTab({ template }) {
  const { state, actions } = useAppContext();
  const issues = getPublishIssues(template, state.roles);
  const canPublish = issues.length === 0;
  const initiatorRoles = template.initiatorRoleIds || [];
  const roleOptions = state.roles.map((role) => ({
    value: role.id,
    label: role.label || role.id,
  }));

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
      <Space direction="vertical" size={6} style={{ width: '100%' }}>
        <Typography.Text>Allowed initiators</Typography.Text>
        <Select
          mode="multiple"
          placeholder="All roles"
          options={roleOptions}
          value={initiatorRoles}
          onChange={(value) =>
            actions.updateTemplate(template.id, (current) => ({
              ...current,
              initiatorRoleIds: value,
            }))
          }
          allowClear
        />
        <Typography.Text className="muted">
          Initiators can create drafts and view the form, but cannot edit fields after creation.
        </Typography.Text>
      </Space>
    </Space>
  );
}

import React from 'react';
import { Card, Space, Tag, Typography } from '@arco-design/web-react';
import { getRoleById, isPartialForStep } from '../utils/workflow.js';

export default function TimelinePanel({ instance, roles }) {
  if (!instance.steps || instance.steps.length === 0) {
    return (
      <Card className="panel-card" title="Timeline" bordered={false}>
        <Typography.Text className="muted">No steps yet.</Typography.Text>
      </Card>
    );
  }

  return (
    <Card className="panel-card" title="Timeline" bordered={false}>
      {instance.steps.map((step) => {
        const fromLabel = getRoleById(roles, step.fromRoleId)?.label || step.fromRoleId;
        const partial = isPartialForStep(instance, step);
        const delegationHistory = step.delegationHistory || [];
        const latestDelegation = delegationHistory[delegationHistory.length - 1];
        const delegateByLabel = latestDelegation
          ? getRoleById(roles, latestDelegation.byRoleId)?.label || latestDelegation.byRoleId
          : '';
        return (
          <div key={step.id} className="timeline-item">
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Space>
                <Typography.Text strong>{step.actionLabel}</Typography.Text>
                {partial ? <Tag color="gold">Partial</Tag> : null}
              </Space>
              <Typography.Text className="muted">
                From {fromLabel} → {step.toGroup}
              </Typography.Text>
              <Space wrap>
                <Tag>Sent {step.sentAt}</Tag>
                {step.openedAt ? <Tag>Opened {step.openedAt}</Tag> : null}
                {step.dueDate ? <Tag>Due {step.dueDate}</Tag> : null}
                {step.lastStep ? <Tag color="red">Reply required</Tag> : null}
              </Space>
              {step.message ? (
                <Typography.Text className="muted">Message: {step.message}</Typography.Text>
              ) : null}
              {latestDelegation ? (
                <Typography.Text className="muted">
                  Delegated {latestDelegation.fromGroup || '-'} → {latestDelegation.toGroup || '-'}
                  {delegateByLabel ? ` by ${delegateByLabel}` : ''}
                  {latestDelegation.at ? ` on ${latestDelegation.at}` : ''}
                  {latestDelegation.note ? ` - Note: ${latestDelegation.note}` : ''}
                </Typography.Text>
              ) : null}
            </Space>
          </div>
        );
      })}
    </Card>
  );
}

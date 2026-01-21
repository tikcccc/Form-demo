import React from 'react';
import { Card, Space, Tag, Typography } from '@arco-design/web-react';
import { getRoleById, isPartialForStep } from '../utils/workflow.js';

export default function TimelinePanel({ instance, roles }) {
  const steps = instance.steps || [];
  const formHistory = instance.formHistory || [];
  const activityLog = instance.activityLog || [];

  if (steps.length === 0 && formHistory.length === 0 && activityLog.length === 0) {
    return (
      <Card className="panel-card" title="Timeline" bordered={false}>
        <Typography.Text className="muted">No activity yet.</Typography.Text>
      </Card>
    );
  }

  const formatValue = (value) => {
    if (value === undefined || value === null) {
      return '—';
    }
    if (typeof value === 'boolean') {
      return value ? 'True' : 'False';
    }
    if (typeof value === 'string' && value.trim() === '') {
      return '(empty)';
    }
    return String(value);
  };

  const formatTimestamp = (value) => {
    if (!value) {
      return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    const pad = (num) => String(num).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate()
    )} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const toTimestamp = (value) => {
    if (!value) {
      return 0;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 0;
    }
    return date.getTime();
  };

  const events = [
    ...steps.map((step, index) => ({
      type: 'step',
      timestamp: toTimestamp(step.sentAt),
      order: index,
      step,
    })),
    ...formHistory.map((entry, index) => ({
      type: 'form',
      timestamp: toTimestamp(entry.at),
      order: index,
      entry,
    })),
    ...activityLog.map((entry, index) => ({
      type: 'log',
      timestamp: toTimestamp(entry.at),
      order: index,
      entry,
    })),
  ].sort((a, b) => {
    if (a.timestamp === b.timestamp) {
      if (a.type === b.type) {
        return a.order - b.order;
      }
      return a.type === 'step' ? -1 : 1;
    }
    return a.timestamp - b.timestamp;
  });

  return (
    <Card className="panel-card" title="Timeline" bordered={false}>
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        {events.map((event) => {
          if (event.type === 'step') {
            const { step } = event;
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
                      Delegated {latestDelegation.fromGroup || '-'} →{' '}
                      {latestDelegation.toGroup || '-'}
                      {delegateByLabel ? ` by ${delegateByLabel}` : ''}
                      {latestDelegation.at ? ` on ${latestDelegation.at}` : ''}
                      {latestDelegation.note ? ` - Note: ${latestDelegation.note}` : ''}
                    </Typography.Text>
                  ) : null}
                </Space>
              </div>
            );
          }

          if (event.type === 'form') {
            const { entry } = event;
            const byLabel = getRoleById(roles, entry.byRoleId)?.label || entry.byRoleId || '-';
            return (
              <div key={entry.id || `${entry.fieldKey}-${entry.at}`} className="timeline-item">
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Space>
                    <Typography.Text strong>
                      {entry.fieldLabel || entry.fieldKey || 'Field'} updated
                    </Typography.Text>
                    <Tag color="blue">Form</Tag>
                  </Space>
                  <Typography.Text className="muted">
                    By {byLabel}
                    {entry.at ? ` at ${formatTimestamp(entry.at)}` : ''}
                  </Typography.Text>
                  <Typography.Text className="muted">
                    {formatValue(entry.from)} → {formatValue(entry.to)}
                  </Typography.Text>
                </Space>
              </div>
            );
          }

          const { entry } = event;
          const byLabel = getRoleById(roles, entry.byRoleId)?.label || entry.byRoleId || '-';
          return (
            <div key={entry.id || `${entry.type}-${entry.at}`} className="timeline-item">
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <Space>
                  <Typography.Text strong>{entry.message || 'Activity'}</Typography.Text>
                  <Tag>Log</Tag>
                </Space>
                <Typography.Text className="muted">
                  By {byLabel}
                  {entry.at ? ` at ${formatTimestamp(entry.at)}` : ''}
                </Typography.Text>
              </Space>
            </div>
          );
        })}
      </Space>
    </Card>
  );
}

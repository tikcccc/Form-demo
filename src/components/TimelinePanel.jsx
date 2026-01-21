import React, { useMemo } from 'react';
import { Card, Space, Tabs, Tag, Typography } from '@arco-design/web-react';
import { getRoleById, isPartialForStep } from '../utils/workflow.js';

const { TabPane } = Tabs;

export default function TimelinePanel({ instance, roles }) {
  const steps = instance.steps || [];
  const formHistory = instance.formHistory || [];
  const activityLog = instance.activityLog || [];

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

  const stepIndexMap = useMemo(
    () => new Map(steps.map((step, index) => [step.id, index])),
    [steps]
  );

  const getStepLabel = (step) => {
    const index = stepIndexMap.get(step.id);
    if (index === undefined) {
      return step.actionLabel || 'Step';
    }
    return `Step ${index + 1} - ${step.actionLabel}`;
  };

  const progressEvents = useMemo(() => {
    const events = [];
    steps.forEach((step, index) => {
      events.push({
        type: 'action',
        timestamp: toTimestamp(step.sentAt),
        order: events.length,
        step,
        stepIndex: index,
      });
      (step.delegationHistory || []).forEach((entry) => {
        events.push({
          type: 'delegate',
          timestamp: toTimestamp(entry.at),
          order: events.length,
          step,
          stepIndex: index,
          entry,
        });
      });
    });
    activityLog.forEach((entry) => {
      events.push({
        type: 'view',
        timestamp: toTimestamp(entry.at),
        order: events.length,
        entry,
      });
    });
    return events.sort((a, b) => {
      if (a.timestamp === b.timestamp) {
        return a.order - b.order;
      }
      return a.timestamp - b.timestamp;
    });
  }, [activityLog, steps]);

  const editEvents = useMemo(() => {
    const events = formHistory.map((entry, index) => ({
      entry,
      timestamp: toTimestamp(entry.at),
      order: index,
    }));
    return events.sort((a, b) => {
      if (a.timestamp === b.timestamp) {
        return a.order - b.order;
      }
      return a.timestamp - b.timestamp;
    });
  }, [formHistory]);

  return (
    <Card className="panel-card" title="Timeline" bordered={false}>
      <Tabs defaultActiveTab="progress" type="text">
        <TabPane key="progress" title="Progress">
          {progressEvents.length === 0 ? (
            <Typography.Text className="muted">No progress yet.</Typography.Text>
          ) : (
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              {progressEvents.map((event) => {
                if (event.type === 'action') {
                  const { step } = event;
                  const fromLabel =
                    getRoleById(roles, step.fromRoleId)?.label || step.fromRoleId;
                  const partial = isPartialForStep(instance, step);
                  return (
                    <div key={`action-${step.id}`} className="timeline-item">
                      <Space direction="vertical" size={4} style={{ width: '100%' }}>
                        <Space>
                          <Typography.Text strong>{getStepLabel(step)}</Typography.Text>
                          {partial ? <Tag color="gold">Partial</Tag> : null}
                        </Space>
                        <Typography.Text className="muted">
                          From {fromLabel} → {step.toGroup}
                        </Typography.Text>
                        <Space wrap>
                          <Tag>Sent {step.sentAt}</Tag>
                          {step.dueDate ? <Tag>Due {step.dueDate}</Tag> : null}
                          {step.lastStep ? <Tag color="red">Reply required</Tag> : null}
                        </Space>
                        {step.message ? (
                          <Typography.Text className="muted">
                            Message: {step.message}
                          </Typography.Text>
                        ) : null}
                      </Space>
                    </div>
                  );
                }

                if (event.type === 'delegate') {
                  const { step, entry } = event;
                  const byLabel =
                    getRoleById(roles, entry.byRoleId)?.label || entry.byRoleId || '-';
                  return (
                    <div
                      key={`delegate-${step.id}-${entry.at || ''}-${entry.byRoleId || ''}`}
                      className="timeline-item"
                    >
                      <Space direction="vertical" size={4} style={{ width: '100%' }}>
                        <Space>
                          <Typography.Text strong>Delegate Access</Typography.Text>
                          <Tag>{getStepLabel(step)}</Tag>
                        </Space>
                        <Typography.Text className="muted">
                          Added access for {entry.toGroup || '-'}
                          {entry.fromGroup ? ` (original: ${entry.fromGroup})` : ''}
                        </Typography.Text>
                        <Typography.Text className="muted">
                          By {byLabel}
                          {entry.at ? ` at ${formatTimestamp(entry.at)}` : ''}
                        </Typography.Text>
                        {entry.note ? (
                          <Typography.Text className="muted">Note: {entry.note}</Typography.Text>
                        ) : null}
                      </Space>
                    </div>
                  );
                }

                const { entry } = event;
                return (
                  <div
                    key={entry.id || `${entry.type || 'view'}-${entry.at || event.order}`}
                    className="timeline-item"
                  >
                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                      <Space>
                        <Typography.Text strong>View</Typography.Text>
                        <Tag>Log</Tag>
                      </Space>
                      {entry.message ? (
                        <Typography.Text className="muted">{entry.message}</Typography.Text>
                      ) : null}
                      {entry.at ? (
                        <Typography.Text className="muted">
                          {formatTimestamp(entry.at)}
                        </Typography.Text>
                      ) : null}
                    </Space>
                  </div>
                );
              })}
            </Space>
          )}
        </TabPane>
        <TabPane key="edits" title="Edit Log">
          {editEvents.length === 0 ? (
            <Typography.Text className="muted">No edits yet.</Typography.Text>
          ) : (
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              {editEvents.map(({ entry }) => {
                const byLabel =
                  getRoleById(roles, entry.byRoleId)?.label || entry.byRoleId || '-';
                const stepLabel = entry.stepId
                  ? stepIndexMap.has(entry.stepId)
                    ? getStepLabel(steps[stepIndexMap.get(entry.stepId)])
                    : entry.stepLabel || 'Step'
                  : entry.stepLabel || 'Draft';
                return (
                  <div key={entry.id || `${entry.fieldKey}-${entry.at}`} className="timeline-item">
                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                      <Typography.Text strong>
                        {entry.fieldLabel || entry.fieldKey || 'Field'} updated
                      </Typography.Text>
                      <Typography.Text className="muted">Step: {stepLabel}</Typography.Text>
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
              })}
            </Space>
          )}
        </TabPane>
      </Tabs>
    </Card>
  );
}

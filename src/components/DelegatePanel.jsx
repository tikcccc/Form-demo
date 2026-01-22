import React from 'react';
import { Button, Card, Input, Select, Space, Typography } from '@arco-design/web-react';

export default function DelegatePanel({
  currentGroups = [],
  delegateGroups = [],
  options,
  selectedGroup,
  onSelectGroup,
  note,
  onNoteChange,
  onDelegate,
  disabled = false,
}) {
  const canDelegate =
    !disabled &&
    Boolean(selectedGroup) &&
    !currentGroups.includes(selectedGroup) &&
    !delegateGroups.includes(selectedGroup);
  const hasDelegates = delegateGroups.length > 0;
  const delegateSummary = hasDelegates ? delegateGroups.join(', ') : 'None';
  const currentSummary = currentGroups.length > 0 ? currentGroups.join(', ') : '-';

  return (
    <Card className="panel-card" title="Delegate Access" bordered={false}>
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Space direction="vertical" size={2}>
          <Typography.Text className="muted">Current recipients: {currentSummary}</Typography.Text>
          <Typography.Text className="muted">Delegated groups: {delegateSummary}</Typography.Text>
          <Typography.Text className="muted">
            Delegation adds access without removing existing recipients.
          </Typography.Text>
        </Space>
        <Select
          placeholder="Add delegate group"
          value={selectedGroup || undefined}
          onChange={onSelectGroup}
          options={options}
          disabled={options.length === 0}
        />
        <Input.TextArea
          placeholder="Note (optional)"
          autoSize
          value={note}
          onChange={onNoteChange}
        />
        <Button type="primary" disabled={!canDelegate} onClick={onDelegate}>
          Add Delegate
        </Button>
        {options.length === 0 && (
          <Typography.Text className="muted">
            No other groups available for delegation.
          </Typography.Text>
        )}
      </Space>
    </Card>
  );
}

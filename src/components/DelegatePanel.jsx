import React from 'react';
import { Button, Card, Input, Select, Space, Typography } from '@arco-design/web-react';

export default function DelegatePanel({
  currentGroup,
  options,
  selectedGroup,
  onSelectGroup,
  note,
  onNoteChange,
  onDelegate,
  disabled = false,
}) {
  const canDelegate =
    !disabled && Boolean(selectedGroup) && selectedGroup !== currentGroup;

  return (
    <Card className="panel-card" title="Delegate Step" bordered={false}>
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Typography.Text className="muted">
          Current To: {currentGroup || '-'}.
          Handover responsibility to another group.
        </Typography.Text>
        <Select
          placeholder="Delegate to"
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
          Delegate
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

import React from 'react';
import { Alert, Button, Card, Input, Select, Space, Tag, Typography } from '@arco-design/web-react';

export default function ActionPanel({
  actions,
  selectedActionId,
  onSelectAction,
  selectedToGroups,
  onSelectToGroups,
  message,
  onMessageChange,
  onSend,
  attachmentsReady,
  statusRequired = false,
  messageRequired = false,
  formValid = true,
  showFormErrors = false,
}) {
  const selectedAction = actions.find((action) => action.id === selectedActionId);
  const toOptions = selectedAction
    ? selectedAction.toCandidateGroups.map((group) => ({ value: group, label: group }))
    : [];
  const trimmedMessage = message ? message.trim() : '';
  const messageMissing = messageRequired && !trimmedMessage;
  const canSend = Boolean(
    selectedAction &&
      selectedToGroups &&
      selectedToGroups.length > 0 &&
      (!statusRequired || attachmentsReady) &&
      formValid &&
      !messageMissing
  );

  return (
    <Card className="panel-card" title="Take Action" bordered={false}>
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Select
          placeholder="Select action"
          value={selectedActionId || undefined}
          onChange={onSelectAction}
          options={actions.map((action) => ({ value: action.id, label: action.label }))}
        />
        <Select
          mode="multiple"
          placeholder="Send to groups"
          value={selectedToGroups}
          onChange={onSelectToGroups}
          options={toOptions}
          disabled={!selectedAction}
        />
        <Input.TextArea
          placeholder={messageRequired ? 'Reply message (required)' : 'Message (optional)'}
          autoSize
          value={message}
          onChange={onMessageChange}
          required={messageRequired}
        />
        {selectedAction && (
          <Space wrap>
            {selectedAction.dueDays ? <Tag>Due in {selectedAction.dueDays}d</Tag> : null}
            {selectedAction.lastStep ? <Tag color="gold">Reply required</Tag> : null}
            {selectedAction.requiresAttachmentStatus ? <Tag color="blue">Attachment status</Tag> : null}
            {selectedAction.closeInstance ? <Tag color="red">Closes form</Tag> : null}
          </Space>
        )}
        {selectedAction && messageMissing && (
          <Alert type="warning" content="Reply message is required." />
        )}
        {selectedAction && statusRequired && !attachmentsReady && (
          <Alert type="warning" content="Set status for all incoming attachments before sending." />
        )}
        {!formValid && showFormErrors && (
          <Alert type="warning" content="Fix form validation errors before sending." />
        )}
        <Button type="primary" disabled={!canSend} onClick={onSend}>
          Send
        </Button>
        {!selectedAction && (
          <Typography.Text className="muted">
            Choose an action to continue.
          </Typography.Text>
        )}
      </Space>
    </Card>
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Space, Typography } from '@arco-design/web-react';
import { useNavigate, useParams } from 'react-router-dom';
import ActionPanel from '../components/ActionPanel.jsx';
import AttachmentsPanel from '../components/AttachmentsPanel.jsx';
import DetailHeader from '../components/DetailHeader.jsx';
import DynamicForm from '../components/DynamicForm.jsx';
import TimelinePanel from '../components/TimelinePanel.jsx';
import { useAppContext } from '../store/AppContext.jsx';
import {
  areAttachmentStatusesComplete,
  getAvailableActions,
  getCurrentTo,
  getDueDate,
  getLatestSentStep,
  getRoleById,
  getTemplateById,
  isInbox,
  isUnread,
  validateFormData,
} from '../utils/workflow.js';

export default function WorkflowDetailPage() {
  const { state, actions } = useAppContext();
  const { instanceId } = useParams();
  const navigate = useNavigate();
  const instance = state.instances.find((item) => item.id === instanceId);

  const [selectedActionId, setSelectedActionId] = useState('');
  const [selectedToGroup, setSelectedToGroup] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setSelectedActionId('');
    setSelectedToGroup('');
    setMessage('');
  }, [instanceId]);

  const template = getTemplateById(state.templates, instance?.templateId);
  const availableActions = useMemo(
    () => getAvailableActions(template, state.currentRoleId),
    [template, state.currentRoleId]
  );

  const selectedAction = availableActions.find((action) => action.id === selectedActionId);
  const latestStep = instance ? getLatestSentStep(instance) : null;
  const inInbox = instance
    ? isInbox(instance, state.currentRoleId, state.roles)
    : false;
  const unread = instance
    ? isUnread(instance, state.currentRoleId, state.roles)
    : false;
  const attachmentsReady = instance ? areAttachmentStatusesComplete(instance) : true;

  useEffect(() => {
    if (selectedAction) {
      setSelectedToGroup(selectedAction.toCandidateGroups[0] || '');
    }
  }, [selectedAction]);

  useEffect(() => {
    if (selectedActionId && !selectedAction) {
      setSelectedActionId('');
      setSelectedToGroup('');
    }
  }, [selectedActionId, selectedAction]);

  const formData = instance?.formData || {};
  const formErrors = useMemo(() => validateFormData(template, formData), [formData, template]);

  if (!instance) {
    return <Typography.Text>Workflow not found.</Typography.Text>;
  }

  const editable = instance.steps.length === 0;
  const formValid = !editable || Object.keys(formErrors).length === 0;
  const canTakeAction = instance.status === 'Open' && (inInbox || editable);
  const createdByLabel = getRoleById(state.roles, instance.createdBy)?.label || instance.createdBy;

  const handleSend = () => {
    if (!selectedAction || !selectedToGroup) {
      return;
    }
    if (selectedAction.requiresAttachmentStatus && !attachmentsReady) {
      return;
    }
    if (editable && !formValid) {
      return;
    }
    actions.sendAction({
      instanceId: instance.id,
      action: selectedAction,
      toGroup: selectedToGroup,
      message,
    });
    setSelectedActionId('');
    setSelectedToGroup('');
    setMessage('');
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <DetailHeader
        instance={instance}
        templateName={template?.name || instance.templateId}
        createdByLabel={createdByLabel}
        currentTo={getCurrentTo(instance)}
        dueDate={getDueDate(instance)}
        hasSteps={instance.steps.length > 0}
        onBack={() => navigate(-1)}
      />
      {inInbox && (
        <Alert
          type="info"
          title="You are the recipient"
          content={
            <Space>
              <Typography.Text>
                {latestStep?.lastStep ? 'Reply required.' : 'Review and respond when ready.'}
              </Typography.Text>
              {latestStep?.dueDate ? (
                <Typography.Text className="muted">Due {latestStep.dueDate}</Typography.Text>
              ) : null}
            </Space>
          }
          action={
            unread ? (
              <Button size="mini" onClick={() => actions.markOpened(instance.id)}>
                Mark as Opened
              </Button>
            ) : null
          }
        />
      )}
      <div className="detail-grid">
        <DynamicForm
          template={template}
          formData={instance.formData}
          editable={editable}
          onChange={(key, value) => actions.updateFormField(instance.id, key, value)}
          errors={formErrors}
          showValidation={editable}
        />
        <AttachmentsPanel
          attachments={instance.attachments}
          onAdd={(attachment) => actions.addAttachment(instance.id, attachment)}
          onStatusChange={(attachmentId, status) =>
            actions.updateAttachmentStatus(instance.id, attachmentId, status)
          }
          statusRequired={Boolean(selectedAction?.requiresAttachmentStatus)}
          statusOptions={selectedAction?.statusSet || ['Approved', 'Rejected', 'AIP', 'For Info']}
        />
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          {canTakeAction && (
            <ActionPanel
              actions={availableActions}
              selectedActionId={selectedActionId}
              onSelectAction={setSelectedActionId}
              selectedToGroup={selectedToGroup}
              onSelectToGroup={setSelectedToGroup}
              message={message}
              onMessageChange={setMessage}
              onSend={handleSend}
              attachmentsReady={attachmentsReady}
              formValid={formValid}
              showFormErrors={editable}
            />
          )}
          <TimelinePanel instance={instance} roles={state.roles} />
        </Space>
      </div>
    </Space>
  );
}

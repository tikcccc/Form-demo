import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Space, Typography } from '@arco-design/web-react';
import { useNavigate, useParams } from 'react-router-dom';
import ActionPanel from '../components/ActionPanel.jsx';
import AttachmentsPanel from '../components/AttachmentsPanel.jsx';
import DelegatePanel from '../components/DelegatePanel.jsx';
import DetailHeader from '../components/DetailHeader.jsx';
import DynamicForm from '../components/DynamicForm.jsx';
import TimelinePanel from '../components/TimelinePanel.jsx';
import { useAppContext } from '../store/AppContext.jsx';
import {
  areAttachmentStatusesComplete,
  canViewInstance,
  getAvailableActionsForInstance,
  getCurrentTo,
  getDueDate,
  getLatestSentStep,
  getLoopCount,
  getRoleById,
  getRoleGroup,
  getTemplateById,
  isProjectAdmin,
  isInbox,
  isUnread,
  validateFormData,
} from '../utils/workflow.js';

export default function WorkflowDetailPage() {
  const { state, actions } = useAppContext();
  const { instanceId } = useParams();
  const navigate = useNavigate();
  const instance = state.instances.find((item) => item.id === instanceId);
  const canView = instance
    ? canViewInstance(instance, state.currentRoleId, state.roles)
    : false;

  const [selectedActionId, setSelectedActionId] = useState('');
  const [selectedToGroup, setSelectedToGroup] = useState('');
  const [message, setMessage] = useState('');
  const [attachmentViewId, setAttachmentViewId] = useState('draft');
  const [delegateGroup, setDelegateGroup] = useState('');
  const [delegateNote, setDelegateNote] = useState('');
  const [draftFormData, setDraftFormData] = useState(() => instance?.formData || {});
  const [dirtyKeys, setDirtyKeys] = useState([]);

  useEffect(() => {
    setSelectedActionId('');
    setSelectedToGroup('');
    setMessage('');
    setAttachmentViewId('draft');
    setDelegateGroup('');
    setDelegateNote('');
  }, [instanceId]);

  const template = getTemplateById(state.templates, instance?.templateId);
  const loopCount = getLoopCount(template, instance);
  const availableActions = useMemo(
    () => getAvailableActionsForInstance(template, state.currentRoleId, instance),
    [template, state.currentRoleId, instance]
  );
  const commonFields = state.commonFields || [];
  const commonFieldKeys = useMemo(
    () => commonFields.map((field) => field.key),
    [commonFields]
  );

  const actionContextId =
    selectedActionId || (availableActions.length === 1 ? availableActions[0].id : '');
  const selectedAction = availableActions.find((action) => action.id === selectedActionId);
  const statusAction = actionContextId
    ? availableActions.find((action) => action.id === actionContextId)
    : null;
  const latestStep = instance ? getLatestSentStep(instance) : null;
  const latestAction = useMemo(() => {
    if (!template || !latestStep) {
      return null;
    }
    return template.actions.find((action) => action.id === latestStep.actionId) || null;
  }, [template, latestStep]);
  const inInbox = instance
    ? isInbox(instance, state.currentRoleId, state.roles)
    : false;
  const unread = instance
    ? isUnread(instance, state.currentRoleId, state.roles)
    : false;
  const replyRequired = Boolean(inInbox);
  const statusTargetStepId = instance && inInbox && latestStep ? latestStep.id : null;
  const attachmentsReady = instance
    ? areAttachmentStatusesComplete(instance, statusTargetStepId)
    : true;
  const isDraft = instance ? instance.steps.length === 0 : false;
  const canEditForm = instance ? instance.status !== 'Closed' && (isDraft || inInbox) : false;
  const requireEditable = Boolean(instance && !isDraft);
  const canEditAttachments = instance
    ? instance.status !== 'Closed' &&
      (isProjectAdmin(state.currentRoleId) ||
        instance.createdBy === state.currentRoleId ||
        inInbox ||
        isDraft)
    : false;
  const draftAttachments = useMemo(() => {
    if (!instance?.attachments) {
      return [];
    }
    return instance.attachments.filter((attachment) => !attachment.stepId);
  }, [instance]);
  const attachmentsByStep = useMemo(() => {
    if (!instance?.steps || !instance?.attachments) {
      return new Map();
    }
    const map = new Map();
    instance.steps.forEach((step) => {
      map.set(
        step.id,
        instance.attachments.filter((attachment) => attachment.stepId === step.id)
      );
    });
    return map;
  }, [instance]);
  const attachmentViewOptions = useMemo(() => {
    if (!instance) {
      return [];
    }
    const options = [];
    if (canEditAttachments || draftAttachments.length > 0 || instance.steps.length === 0) {
      options.push({ value: 'draft', label: 'Draft (Unsent)' });
    }
    const stepOptions = instance.steps
      .map((step, index) => ({
        value: step.id,
        label: `Step ${index + 1} - ${step.actionLabel} - Sent ${step.sentAt}`,
      }))
      .reverse();
    return [...options, ...stepOptions];
  }, [instance, canEditAttachments, draftAttachments.length]);

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

  useEffect(() => {
    if (!instance || !inInbox) {
      return;
    }
    if (instance.status === 'Sent' && latestStep && !latestStep.openedAt) {
      actions.markOpened(instance.id);
    }
  }, [actions, inInbox, instance, latestStep]);

  const allowDelegate = Boolean(latestStep?.allowDelegate ?? latestAction?.allowDelegate);
  const delegateOptions = useMemo(() => {
    if (!latestStep) {
      return [];
    }
    const baseGroups = latestAction?.toCandidateGroups?.length
      ? latestAction.toCandidateGroups
      : state.roles.map((role) => getRoleGroup(role));
    const uniqueGroups = Array.from(new Set(baseGroups));
    return uniqueGroups
      .filter((group) => group && group !== latestStep.toGroup)
      .map((group) => ({ value: group, label: group }));
  }, [latestAction, latestStep, state.roles]);
  const showDelegatePanel = Boolean(inInbox && latestStep && allowDelegate);

  useEffect(() => {
    if (!showDelegatePanel) {
      setDelegateGroup('');
      return;
    }
    if (delegateOptions.length === 0) {
      setDelegateGroup('');
      return;
    }
    if (!delegateGroup || !delegateOptions.some((option) => option.value === delegateGroup)) {
      setDelegateGroup(delegateOptions[0].value);
    }
  }, [delegateOptions, delegateGroup, showDelegatePanel]);

  const defaultAttachmentViewId = useMemo(() => {
    if (!instance) {
      return 'draft';
    }
    if (instance.steps.length === 0) {
      return 'draft';
    }
    if (inInbox && latestStep?.requiresAttachmentStatus) {
      return latestStep.id;
    }
    if (draftAttachments.length > 0 && canEditAttachments) {
      return 'draft';
    }
    return latestStep?.id || 'draft';
  }, [instance, inInbox, latestStep, draftAttachments.length, canEditAttachments]);

  useEffect(() => {
    if (!instance) {
      return;
    }
    setAttachmentViewId(defaultAttachmentViewId);
  }, [instanceId]);

  useEffect(() => {
    if (!instance) {
      return;
    }
    setDraftFormData(instance.formData || {});
    setDirtyKeys([]);
  }, [instanceId, instance?.formData]);

  useEffect(() => {
    if (!instance) {
      return;
    }
    const availableViews = new Set(attachmentViewOptions.map((option) => option.value));
    if (!availableViews.has(attachmentViewId)) {
      setAttachmentViewId(defaultAttachmentViewId);
    }
  }, [attachmentViewId, attachmentViewOptions, defaultAttachmentViewId, instance]);

  const savedFormData = instance?.formData || {};
  const formData = canEditForm ? draftFormData : savedFormData;
  const formErrors = useMemo(
    () =>
      validateFormData(template, formData, {
        roleId: state.currentRoleId,
        actionId: actionContextId,
        canEdit: canEditForm,
        requireEditable,
        commonFieldKeys,
      }),
    [
      actionContextId,
      canEditForm,
      commonFieldKeys,
      formData,
      requireEditable,
      state.currentRoleId,
      template,
    ]
  );

  if (!instance) {
    return <Typography.Text>Workflow not found.</Typography.Text>;
  }
  if (!canView) {
    return <Typography.Text>Access denied.</Typography.Text>;
  }

  const isDraftView = attachmentViewId === 'draft';
  const attachmentsForView = isDraftView
    ? draftAttachments
    : attachmentsByStep.get(attachmentViewId) || [];
  const stepForView = isDraftView
    ? null
    : instance.steps.find((step) => step.id === attachmentViewId);
  const isLatestStepView = Boolean(stepForView && latestStep?.id === stepForView.id);
  const statusOptionsForView =
    statusAction?.statusSet && statusAction.statusSet.length > 0
      ? statusAction.statusSet
      : ['Approved', 'Rejected', 'AIP', 'For Info'];
  const statusRequiredForView =
    canEditAttachments &&
    Boolean(statusAction?.requiresAttachmentStatus) &&
    (isLatestStepView || (isDraftView && instance.steps.length === 0));
  const isFormDirty = dirtyKeys.length > 0;
  const formValid = !canEditForm || Object.keys(formErrors).length === 0;
  const canTakeAction = instance.status !== 'Closed' && (inInbox || isDraft);
  const createdByLabel = getRoleById(state.roles, instance.createdBy)?.label || instance.createdBy;
  const delegateEnabled = Boolean(
    showDelegatePanel && delegateOptions.length > 0 && delegateGroup
  );

  const handleFormChange = (key, value) => {
    if (!canEditForm) {
      return;
    }
    setDraftFormData((prev) => ({ ...prev, [key]: value }));
    const savedValue = savedFormData[key];
    setDirtyKeys((prev) => {
      const next = new Set(prev);
      if (Object.is(savedValue, value)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return Array.from(next);
    });
  };

  const handleFormSave = () => {
    if (!instance || !isFormDirty) {
      return;
    }
    if (Object.keys(formErrors).length > 0) {
      return;
    }
    actions.updateFormData(instance.id, draftFormData);
  };

  const handleSend = () => {
    if (!selectedAction || !selectedToGroup) {
      return;
    }
    if (selectedAction.requiresAttachmentStatus && !attachmentsReady) {
      return;
    }
    if (replyRequired && !message.trim()) {
      return;
    }
    if (canEditForm && !formValid) {
      return;
    }
    if (canEditForm && isFormDirty) {
      actions.updateFormData(instance.id, draftFormData);
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

  const handleDelegate = () => {
    if (!delegateEnabled || delegateGroup === latestStep?.toGroup) {
      return;
    }
    actions.delegateStep({
      instanceId: instance.id,
      toGroup: delegateGroup,
      note: delegateNote,
    });
    setDelegateNote('');
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <DetailHeader
        instance={instance}
        templateName={template?.name || instance.templateId}
        loopCount={loopCount}
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
                {latestStep?.lastStep
                  ? 'Reply required. Select an action and add a reply message.'
                  : 'Review and respond when ready.'}
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
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <DynamicForm
            template={template}
            formData={formData}
            roleId={state.currentRoleId}
            actionId={actionContextId}
            canEdit={canEditForm}
            requireEditable={requireEditable}
            commonFields={commonFields}
            commonEditable={false}
            onChange={handleFormChange}
            errors={formErrors}
            showValidation={canEditForm}
          />
          {canEditForm && (
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button
                type="primary"
                onClick={handleFormSave}
                disabled={!isFormDirty || Object.keys(formErrors).length > 0}
              >
                Save
              </Button>
            </Space>
          )}
        </Space>
        <AttachmentsPanel
          attachments={attachmentsForView}
          onAdd={(attachment) => actions.addAttachment(instance.id, attachment)}
          onDelete={(attachmentId) => actions.removeAttachment(instance.id, attachmentId)}
          onStatusChange={(attachmentId, status) =>
            actions.updateAttachmentStatus(instance.id, attachmentId, status)
          }
          statusRequired={statusRequiredForView}
          statusOptions={statusOptionsForView}
          fileLibrary={state.fileLibrary}
          viewOptions={attachmentViewOptions}
          activeViewId={attachmentViewId}
          onViewChange={setAttachmentViewId}
          canEdit={canEditAttachments}
        />
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          {showDelegatePanel && (
            <DelegatePanel
              currentGroup={latestStep?.toGroup}
              options={delegateOptions}
              selectedGroup={delegateGroup}
              onSelectGroup={setDelegateGroup}
              note={delegateNote}
              onNoteChange={setDelegateNote}
              onDelegate={handleDelegate}
              disabled={!delegateEnabled}
            />
          )}
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
              messageRequired={replyRequired}
              formValid={formValid}
              showFormErrors={canEditForm}
            />
          )}
          <TimelinePanel instance={instance} roles={state.roles} />
        </Space>
      </div>
    </Space>
  );
}

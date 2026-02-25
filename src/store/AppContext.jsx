import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { initialState } from '../data/mockData.js';
import {
  addDays,
  buildDefaultFormData,
  buildDefaultCommonData,
  bumpVersion,
  canInitiateTemplate,
  getAvailableActionsForInstance,
  getBaseGroupsForStep,
  getLatestSentStep,
  getNextTransmittalNo,
  getRecipientGroupsForStep,
  getRoleById,
  getRoleGroup,
  getTemplateById,
  isProjectAdmin,
  todayISO,
  validateCommonFields,
} from '../utils/workflow.js';

const AppContext = createContext(null);

const isEmptyLogValue = (value) =>
  value === undefined || value === null || value === '' || Number.isNaN(value);

const normalizeRoleId = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export function AppProvider({ children }) {
  const [state, setState] = useState(initialState);

  useEffect(() => {
    setState((prev) => {
      let nextState = prev;
      if (!prev.fileLibrary) {
        nextState = { ...nextState, fileLibrary: initialState.fileLibrary };
      }
      if (!Array.isArray(prev.commonFields)) {
        nextState = { ...nextState, commonFields: initialState.commonFields };
      }
      if (!Array.isArray(prev.attachmentStatusOptions)) {
        nextState = {
          ...nextState,
          attachmentStatusOptions: initialState.attachmentStatusOptions,
        };
      }
      return nextState;
    });
  }, []);

  const actions = useMemo(
    () => ({
      setRole(roleId) {
        setState((prev) => ({ ...prev, currentRoleId: roleId }));
      },
      addRole({ label }) {
        const trimmedLabel = label ? label.trim() : '';
        if (!trimmedLabel) {
          return;
        }
        setState((prev) => {
          const baseId = normalizeRoleId(trimmedLabel) || `role-${Date.now()}`;
          const existingIds = new Set(prev.roles.map((role) => role.id));
          let candidateId = baseId;
          let suffix = 1;
          while (existingIds.has(candidateId)) {
            candidateId = `${baseId}-${suffix}`;
            suffix += 1;
          }
          const newRole = { id: candidateId, label: trimmedLabel };
          return {
            ...prev,
            roles: [...prev.roles, newRole],
            currentRoleId: candidateId,
          };
        });
      },
      setProject(projectId) {
        setState((prev) => ({ ...prev, currentProjectId: projectId }));
      },
      resetData() {
        setState((prev) => ({
          ...initialState,
          currentRoleId: initialState.roles.some((role) => role.id === prev.currentRoleId)
            ? prev.currentRoleId
            : initialState.currentRoleId,
          currentProjectId: prev.currentProjectId,
        }));
      },
      createInstance({ templateId, title, commonFieldValues = {} }) {
        const newId = `inst-${Date.now()}`;
        let createdId = null;
        setState((prev) => {
          const template = getTemplateById(prev.templates, templateId);
          if (!template) {
            return prev;
          }
          if (!canInitiateTemplate(template, prev.currentRoleId)) {
            return prev;
          }
          const transmittalNo = getNextTransmittalNo(template, prev.instances);
          const formData = buildDefaultFormData(template);
          const commonDefaults = buildDefaultCommonData(prev.commonFields || []);
          const nextCommonValues = { ...commonDefaults, ...commonFieldValues };
          if (title && !Object.prototype.hasOwnProperty.call(commonFieldValues, 'title')) {
            nextCommonValues.title = title;
          }
          const commonErrors = validateCommonFields(prev.commonFields || [], nextCommonValues);
          if (Object.keys(commonErrors).length > 0) {
            return prev;
          }
          Object.entries(nextCommonValues).forEach(([key, value]) => {
            formData[key] = value;
          });
          const templateLabel = template?.name || templateId;
          const instanceTitle =
            nextCommonValues.title || title || formData.title || `New ${templateLabel}`;
          const logAt = new Date().toISOString();
          const initiatorLabel =
            getRoleById(prev.roles, prev.currentRoleId)?.label || prev.currentRoleId;
          const newInstance = {
            id: newId,
            transmittalNo,
            templateId,
            title: instanceTitle,
            status: 'Draft',
            createdBy: prev.currentRoleId,
            createdAt: todayISO(),
            formData,
            attachments: [],
            steps: [],
            formHistory: [],
            activityLog: [
              {
                id: `log-${Date.now()}`,
                type: 'initiate',
                message: `${initiatorLabel} initiated the form.`,
                byRoleId: prev.currentRoleId,
                at: logAt,
              },
            ],
          };
          createdId = newId;
          return {
            ...prev,
            instances: [newInstance, ...prev.instances],
          };
        });
        return createdId;
      },
      deleteInstance(instanceId) {
        setState((prev) => {
          if (!isProjectAdmin(prev.currentRoleId)) {
            return prev;
          }
          if (!prev.instances.some((instance) => instance.id === instanceId)) {
            return prev;
          }
          return {
            ...prev,
            instances: prev.instances.filter((instance) => instance.id !== instanceId),
          };
        });
      },
      updateCommonFields(updater) {
        setState((prev) => {
          const nextCommonFields =
            typeof updater === 'function' ? updater(prev.commonFields || []) : updater;
          return {
            ...prev,
            commonFields: nextCommonFields,
          };
        });
      },
      updateAttachmentStatusOptions(updater) {
        setState((prev) => {
          const nextOptions =
            typeof updater === 'function'
              ? updater(prev.attachmentStatusOptions || [])
              : updater;
          return {
            ...prev,
            attachmentStatusOptions: nextOptions,
          };
        });
      },
      updateFormField(instanceId, key, value) {
        setState((prev) => ({
          ...prev,
          instances: prev.instances.map((instance) => {
            if (instance.id !== instanceId) {
              return instance;
            }
            const previousValue = instance.formData[key];
            if (Object.is(previousValue, value)) {
              return instance;
            }
            const nextFormData = { ...instance.formData, [key]: value };
            const shouldLog = !isEmptyLogValue(previousValue) && !isEmptyLogValue(value);
            const nextHistory = shouldLog
              ? (() => {
                  const stepContext =
                    instance.steps && instance.steps.length > 0 ? getLatestSentStep(instance) : null;
                  const stepIndex = stepContext
                    ? instance.steps.findIndex((step) => step.id === stepContext.id)
                    : -1;
                  const stepLabel =
                    stepContext && stepIndex >= 0
                      ? `Step ${stepIndex + 1} - ${stepContext.actionLabel}`
                      : 'Draft';
                  const template = getTemplateById(prev.templates, instance.templateId);
                  const commonField = (prev.commonFields || []).find((field) => field.key === key);
                  const schemaField = template?.schema?.find((field) => field.key === key);
                  const fieldLabel = commonField?.label || schemaField?.label || key;
                  return [
                    ...(instance.formHistory || []),
                    {
                      id: `fh-${Date.now()}`,
                      fieldKey: key,
                      fieldLabel,
                      from: previousValue,
                      to: value,
                      byRoleId: prev.currentRoleId,
                      stepId: stepContext?.id || '',
                      stepLabel,
                      at: new Date().toISOString(),
                    },
                  ];
                })()
              : instance.formHistory || [];
            return {
              ...instance,
              formData: nextFormData,
              title: key === 'title' ? value : instance.title,
              formHistory: nextHistory,
            };
          }),
        }));
      },
      updateFormData(instanceId, updates = {}) {
        setState((prev) => ({
          ...prev,
          instances: prev.instances.map((instance) => {
            if (instance.id !== instanceId) {
              return instance;
            }
            const nextFormData = { ...instance.formData };
            const savedAt = new Date().toISOString();
            let changeCount = 0;
            const nextHistory = [...(instance.formHistory || [])];
            const stepContext =
              instance.steps && instance.steps.length > 0 ? getLatestSentStep(instance) : null;
            const stepIndex = stepContext
              ? instance.steps.findIndex((step) => step.id === stepContext.id)
              : -1;
            const stepLabel =
              stepContext && stepIndex >= 0
                ? `Step ${stepIndex + 1} - ${stepContext.actionLabel}`
                : 'Draft';

            Object.entries(updates).forEach(([key, value]) => {
              if (Object.is(instance.formData[key], value)) {
                return;
              }
              nextFormData[key] = value;
              const previousValue = instance.formData[key];
              const shouldLog = !isEmptyLogValue(previousValue) && !isEmptyLogValue(value);
              if (shouldLog) {
                const template = getTemplateById(prev.templates, instance.templateId);
                const commonFields = prev.commonFields || [];
                const commonField = commonFields.find((field) => field.key === key);
                const schemaField = template?.schema?.find((field) => field.key === key);
                const fieldLabel = commonField?.label || schemaField?.label || key;
                nextHistory.push({
                  id: `fh-${Date.now()}-${changeCount}`,
                  fieldKey: key,
                  fieldLabel,
                  from: previousValue,
                  to: value,
                  byRoleId: prev.currentRoleId,
                  stepId: stepContext?.id || '',
                  stepLabel,
                  at: savedAt,
                });
              }
              changeCount += 1;
            });

            if (changeCount === 0) {
              return instance;
            }

            const nextTitle = Object.prototype.hasOwnProperty.call(nextFormData, 'title')
              ? nextFormData.title
              : instance.title;

            return {
              ...instance,
              formData: nextFormData,
              title: nextTitle,
              formHistory: nextHistory,
            };
          }),
        }));
      },
      addAttachment(instanceId, attachment) {
        setState((prev) => ({
          ...prev,
          instances: prev.instances.map((instance) => {
            if (instance.id !== instanceId) {
              return instance;
            }
            const nextAttachment = {
              id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              stepId: '',
              status: '',
              ...attachment,
            };
            return {
              ...instance,
              attachments: [...instance.attachments, nextAttachment],
            };
          }),
        }));
      },
      removeAttachment(instanceId, attachmentId) {
        setState((prev) => ({
          ...prev,
          instances: prev.instances.map((instance) => {
            if (instance.id !== instanceId) {
              return instance;
            }
            const nextAttachments = instance.attachments.filter(
              (attachment) => attachment.id !== attachmentId
            );
            return { ...instance, attachments: nextAttachments };
          }),
        }));
      },
      updateAttachmentStatus(instanceId, attachmentId, status) {
        setState((prev) => ({
          ...prev,
          instances: prev.instances.map((instance) => {
            if (instance.id !== instanceId) {
              return instance;
            }
            const nextAttachments = instance.attachments.map((attachment) =>
              attachment.id === attachmentId ? { ...attachment, status } : attachment
            );
            return { ...instance, attachments: nextAttachments };
          }),
        }));
      },
      markOpened(instanceId) {
        setState((prev) => ({
          ...prev,
          instances: prev.instances.map((instance) => {
            if (instance.id !== instanceId) {
              return instance;
            }
            const latest = getLatestSentStep(instance);
            if (!latest) {
              return instance;
            }
            const role = getRoleById(prev.roles, prev.currentRoleId);
            if (!role) {
              return instance;
            }
            const roleGroup = getRoleGroup(role);
            if (!roleGroup || !getRecipientGroupsForStep(latest).includes(roleGroup)) {
              return instance;
            }
            const existingLogs = instance.activityLog || [];
            const hasViewLog = existingLogs.some(
              (entry) =>
                entry.type === 'view' &&
                entry.byRoleId === prev.currentRoleId &&
                entry.stepId === latest.id
            );
            const shouldSetOpenedAt = !latest.openedAt;
            if (!shouldSetOpenedAt && hasViewLog) {
              return instance;
            }
            const template = getTemplateById(prev.templates, instance.templateId);
            const latestAction = template?.actions?.find((action) => action.id === latest.actionId);
            const shouldClose = Boolean(latestAction?.closeInstance);
            const openedAt = todayISO();
            const logAt = new Date().toISOString();
            const nextSteps = shouldSetOpenedAt
              ? instance.steps.map((step) =>
                  step.id === latest.id ? { ...step, openedAt } : step
                )
              : instance.steps;
            const nextStatus = shouldSetOpenedAt
              ? shouldClose
                ? 'Closed'
                : instance.status === 'Sent'
                  ? 'Received'
                  : instance.status
              : instance.status;
            const roleLabel = role?.label || prev.currentRoleId;
            const nextActivityLog = [...existingLogs];
            if (!hasViewLog) {
              nextActivityLog.push({
                id: `log-${Date.now()}`,
                type: 'view',
                message: `${roleLabel} viewed the details.`,
                byRoleId: prev.currentRoleId,
                at: logAt,
                stepId: latest.id,
              });
            }
            if (shouldClose && shouldSetOpenedAt) {
              nextActivityLog.push({
                id: `log-${Date.now()}-closed`,
                type: 'closed',
                message: 'Form closed.',
                byRoleId: prev.currentRoleId,
                at: logAt,
                stepId: latest.id,
              });
            }
            return {
              ...instance,
              steps: nextSteps,
              status: nextStatus,
              activityLog: nextActivityLog,
            };
          }),
        }));
      },
      delegateStep({ instanceId, toGroup, note }) {
        setState((prev) => ({
          ...prev,
          instances: prev.instances.map((instance) => {
            if (instance.id !== instanceId) {
              return instance;
            }
            if (!instance.steps || instance.steps.length === 0) {
              return instance;
            }
            if (instance.status === 'Closed') {
              return instance;
            }
            const latest = getLatestSentStep(instance);
            if (!latest || !latest.lastStep) {
              return instance;
            }
            const role = getRoleById(prev.roles, prev.currentRoleId);
            const isAdmin = isProjectAdmin(prev.currentRoleId);
            if (!isAdmin) {
              if (!role) {
                return instance;
              }
              const roleGroup = getRoleGroup(role);
              if (!roleGroup || !getRecipientGroupsForStep(latest).includes(roleGroup)) {
                return instance;
              }
            }
            const recipientGroups = getRecipientGroupsForStep(latest);
            if (!toGroup || recipientGroups.includes(toGroup)) {
              return instance;
            }
            const template = getTemplateById(prev.templates, instance.templateId);
            const action = template?.actions.find((item) => item.id === latest.actionId);
            const canDelegate = Boolean(latest.allowDelegate ?? action?.allowDelegate);
            if (!canDelegate) {
              return instance;
            }
            if (action?.toCandidateGroups?.length && !action.toCandidateGroups.includes(toGroup)) {
              return instance;
            }
            const baseGroups = getBaseGroupsForStep(latest);
            const fromGroup = baseGroups.length > 0 ? baseGroups.join(', ') : latest.toGroup;
            const entry = {
              fromGroup,
              toGroup,
              byRoleId: prev.currentRoleId,
              at: new Date().toISOString(),
              note: note ? note.trim() : '',
            };
            const nextSteps = instance.steps.map((step) => {
              if (step.id !== latest.id) {
                return step;
              }
              const currentDelegates = step.delegateGroups || [];
              const nextDelegates = currentDelegates.includes(toGroup)
                ? currentDelegates
                : [...currentDelegates, toGroup];
              return {
                ...step,
                delegateGroups: nextDelegates,
                delegationHistory: [...(step.delegationHistory || []), entry],
              };
            });
            return { ...instance, steps: nextSteps };
          }),
        }));
      },
      sendAction({ instanceId, action, toGroups, message }) {
        setState((prev) => ({
          ...prev,
          instances: prev.instances.map((instance) => {
            if (instance.id !== instanceId) {
              return instance;
            }
            const rawGroups = Array.isArray(toGroups)
              ? toGroups
              : toGroups
                ? [toGroups]
                : [];
            const uniqueGroups = Array.from(new Set(rawGroups.filter(Boolean)));
            const candidateGroups = action?.toCandidateGroups || [];
            const selectedGroups =
              candidateGroups.length > 0
                ? uniqueGroups.filter((group) => candidateGroups.includes(group))
                : uniqueGroups;
            if (selectedGroups.length === 0) {
              return instance;
            }
            const role = getRoleById(prev.roles, prev.currentRoleId);
            const isAdmin = isProjectAdmin(prev.currentRoleId);
            if (!action.allowedRoles.includes(prev.currentRoleId) && !isAdmin) {
              return instance;
            }
            const template = getTemplateById(prev.templates, instance.templateId);
            const latest = instance.steps?.length ? getLatestSentStep(instance) : null;
            if (!instance.steps || instance.steps.length === 0) {
              const canStartDraft = template
                ? getAvailableActionsForInstance(template, prev.currentRoleId, instance).some(
                    (item) => item.id === action.id
                  )
                : false;
              if (instance.createdBy !== prev.currentRoleId && !isAdmin && !canStartDraft) {
                return instance;
              }
            } else {
              if (!latest || !latest.lastStep) {
                return instance;
              }
              if (!isAdmin) {
                if (!role) {
                  return instance;
                }
                const roleGroup = getRoleGroup(role);
                if (!roleGroup || !getRecipientGroupsForStep(latest).includes(roleGroup)) {
                  return instance;
                }
              }
            }
            if (template?.actionFlowEnabled) {
              const allowedActions = getAvailableActionsForInstance(
                template,
                prev.currentRoleId,
                instance
              );
              if (!allowedActions.some((item) => item.id === action.id)) {
                return instance;
              }
            }
            const sentAt = todayISO();
            const sentAtTime = new Date().toISOString();
            const dueDate = action.dueDays ? addDays(sentAt, action.dueDays) : '';
            const shouldBumpVersion =
              action.id === 'csf-aip' || action.id === 'csf-not-approved';
            const draftAttachments = instance.attachments.filter((attachment) => !attachment.stepId);
            const statusSourceAttachments = action.requiresAttachmentStatus
              ? latest
                ? instance.attachments.filter((attachment) => attachment.stepId === latest.id)
                : draftAttachments
              : [];
            const timestamp = Date.now();
            const newStepId = `step-${timestamp}`;
            const attachmentStatuses = action.requiresAttachmentStatus
              ? statusSourceAttachments.map((attachment) => ({
                  id: attachment.id,
                  status: attachment.status,
                }))
              : [];
            const primaryGroup = selectedGroups[0];
            const newStep = {
              id: newStepId,
              actionId: action.id,
              actionLabel: action.label,
              fromRoleId: prev.currentRoleId,
              toGroup: primaryGroup,
              toGroups: selectedGroups,
              sentAt,
              sentAtTime,
              openedAt: '',
              dueDate,
              lastStep: action.lastStep,
              allowDelegate: Boolean(action.allowDelegate),
              requiresAttachmentStatus: action.requiresAttachmentStatus,
              attachmentStatuses,
              delegateGroups: [],
              ccRoleIds: action.ccRoleIds || [],
              message: message || '',
            };
            const sentAttachments = instance.attachments.map((attachment) =>
              attachment.stepId ? attachment : { ...attachment, stepId: newStepId }
            );
            const bumpedDraftAttachments = shouldBumpVersion
              ? draftAttachments.map((attachment, index) => ({
                  ...attachment,
                  id: `att-${timestamp}-${index}`,
                  version: bumpVersion(attachment.version),
                  status: '',
                  stepId: '',
                }))
              : [];
            const nextAttachments = [...sentAttachments, ...bumpedDraftAttachments];
            const nextStatus = 'Sent';
            return {
              ...instance,
              status: nextStatus,
              attachments: nextAttachments,
              steps: [...instance.steps, newStep],
            };
          }),
        }));
      },
      updateTemplate(templateId, updater) {
        setState((prev) => ({
          ...prev,
          templates: prev.templates.map((template) =>
            template.id === templateId ? updater(template) : template
          ),
        }));
      },
      duplicateTemplate(templateId) {
        setState((prev) => {
          const template = prev.templates.find((item) => item.id === templateId);
          if (!template) {
            return prev;
          }
          const newId = `${templateId}-copy-${Date.now()}`;
          const copy = {
            ...template,
            id: newId,
            name: `${template.name} Copy`,
            published: false,
          };
          return {
            ...prev,
            templates: [...prev.templates, copy],
          };
        });
      },
      createTemplate({ sourceTemplateId, name }) {
        const newId = `tpl-${Date.now()}`;
        setState((prev) => {
          const safeName = name?.trim() || 'Untitled Type';
          const source = sourceTemplateId
            ? prev.templates.find((item) => item.id === sourceTemplateId)
            : null;
          const copy = source
            ? {
                ...source,
                id: newId,
                name: safeName,
                published: false,
              }
            : {
                id: newId,
                name: safeName,
                published: false,
                schema: [],
                layout: { sections: [] },
                actions: [],
                actionFlowEnabled: true,
                initiatorRoleIds: [],
              };
          return {
            ...prev,
            templates: [...prev.templates, copy],
          };
        });
        return newId;
      },
    }),
    []
  );

  return <AppContext.Provider value={{ state, actions }}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}

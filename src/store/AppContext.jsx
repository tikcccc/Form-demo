import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { initialState } from '../data/mockData.js';
import {
  addDays,
  buildDefaultFormData,
  buildDefaultCommonData,
  bumpVersion,
  getAvailableActionsForInstance,
  getLatestSentStep,
  getNextTransmittalNo,
  getRecipientGroupsForStep,
  getRoleById,
  getRoleGroup,
  getTemplateById,
  isProjectAdmin,
  todayISO,
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
        setState((prev) => {
          const template = getTemplateById(prev.templates, templateId);
          const transmittalNo = getNextTransmittalNo(template, prev.instances);
          const formData = buildDefaultFormData(template);
          const commonDefaults = buildDefaultCommonData(prev.commonFields || []);
          const nextCommonValues = { ...commonDefaults, ...commonFieldValues };
          if (title && !Object.prototype.hasOwnProperty.call(commonFieldValues, 'title')) {
            nextCommonValues.title = title;
          }
          Object.entries(nextCommonValues).forEach(([key, value]) => {
            formData[key] = value;
          });
          const templateLabel = template?.name || templateId;
          const instanceTitle =
            nextCommonValues.title || title || formData.title || `New ${templateLabel}`;
          const newInstance = {
            id: newId,
            transmittalNo,
            templateId,
            title: instanceTitle,
            status: 'Sent',
            createdBy: prev.currentRoleId,
            createdAt: todayISO(),
            formData,
            attachments: [],
            steps: [],
            formHistory: [],
            activityLog: [],
          };
          return {
            ...prev,
            instances: [newInstance, ...prev.instances],
          };
        });
        return newId;
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
            if (!latest || latest.openedAt) {
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
            const template = getTemplateById(prev.templates, instance.templateId);
            const latestAction = template?.actions?.find((action) => action.id === latest.actionId);
            const shouldClose = Boolean(latestAction?.closeInstance);
            const openedAt = todayISO();
            const logAt = new Date().toISOString();
            const nextSteps = instance.steps.map((step) =>
              step.id === latest.id ? { ...step, openedAt } : step
            );
            const nextStatus = shouldClose
              ? 'Closed'
              : instance.status === 'Sent'
                ? 'Received'
                : instance.status;
            const roleLabel = role?.label || prev.currentRoleId;
            const nextLogEntry = {
              id: `log-${Date.now()}`,
              type: 'view',
              message: `${roleLabel} viewed the details.`,
              byRoleId: prev.currentRoleId,
              at: logAt,
            };
            const nextActivityLog = [...(instance.activityLog || []), nextLogEntry];
            return { ...instance, steps: nextSteps, status: nextStatus, activityLog: nextActivityLog };
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
            const entry = {
              fromGroup: latest.toGroup,
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
      sendAction({ instanceId, action, toGroup, message }) {
        setState((prev) => ({
          ...prev,
          instances: prev.instances.map((instance) => {
            if (instance.id !== instanceId) {
              return instance;
            }
            const role = getRoleById(prev.roles, prev.currentRoleId);
            const isAdmin = isProjectAdmin(prev.currentRoleId);
            if (!action.allowedRoles.includes(prev.currentRoleId) && !isAdmin) {
              return instance;
            }
            const latest = instance.steps?.length ? getLatestSentStep(instance) : null;
            if (!instance.steps || instance.steps.length === 0) {
              if (instance.createdBy !== prev.currentRoleId && !isAdmin) {
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
            const template = getTemplateById(prev.templates, instance.templateId);
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
            const newStep = {
              id: newStepId,
              actionId: action.id,
              actionLabel: action.label,
              fromRoleId: prev.currentRoleId,
              toGroup,
              sentAt,
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

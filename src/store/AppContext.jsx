import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { initialState } from '../data/mockData.js';
import {
  addDays,
  buildDefaultFormData,
  buildDefaultCommonData,
  bumpRevision,
  getAvailableActionsForInstance,
  getLatestSentStep,
  getNextTransmittalNo,
  getRoleById,
  getTemplateById,
  isProjectAdmin,
  todayISO,
} from '../utils/workflow.js';

const AppContext = createContext(null);

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
      setProject(projectId) {
        setState((prev) => ({ ...prev, currentProjectId: projectId }));
      },
      resetData() {
        setState((prev) => ({
          ...initialState,
          currentRoleId: prev.currentRoleId,
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
            const template = getTemplateById(prev.templates, instance.templateId);
            const commonField = (prev.commonFields || []).find((field) => field.key === key);
            const schemaField = template?.schema?.find((field) => field.key === key);
            const fieldLabel = commonField?.label || schemaField?.label || key;
            const nextFormData = { ...instance.formData, [key]: value };
            const nextHistory = [
              ...(instance.formHistory || []),
              {
                id: `fh-${Date.now()}`,
                fieldKey: key,
                fieldLabel,
                from: previousValue,
                to: value,
                byRoleId: prev.currentRoleId,
                at: new Date().toISOString(),
              },
            ];
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
            const template = getTemplateById(prev.templates, instance.templateId);
            const commonFields = prev.commonFields || [];
            const nextFormData = { ...instance.formData };
            const savedAt = new Date().toISOString();
            let changeCount = 0;
            const nextHistory = [...(instance.formHistory || [])];

            Object.entries(updates).forEach(([key, value]) => {
              if (Object.is(instance.formData[key], value)) {
                return;
              }
              nextFormData[key] = value;
              const commonField = commonFields.find((field) => field.key === key);
              const schemaField = template?.schema?.find((field) => field.key === key);
              const fieldLabel = commonField?.label || schemaField?.label || key;
              nextHistory.push({
                id: `fh-${Date.now()}-${changeCount}`,
                fieldKey: key,
                fieldLabel,
                from: instance.formData[key],
                to: value,
                byRoleId: prev.currentRoleId,
                at: savedAt,
              });
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
            if (!role || latest.toGroup !== role.group) {
              return instance;
            }
            const openedAt = todayISO();
            const logAt = new Date().toISOString();
            const nextSteps = instance.steps.map((step) =>
              step.id === latest.id ? { ...step, openedAt } : step
            );
            const nextStatus = instance.status === 'Sent' ? 'Received' : instance.status;
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
            if (!isAdmin && (!role || latest.toGroup !== role.group)) {
              return instance;
            }
            if (!toGroup || toGroup === latest.toGroup) {
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
              at: todayISO(),
              note: note ? note.trim() : '',
            };
            const nextSteps = instance.steps.map((step) => {
              if (step.id !== latest.id) {
                return step;
              }
              const nextCcRoleIds = step.ccRoleIds || [];
              const updatedCcRoleIds = nextCcRoleIds.includes(prev.currentRoleId)
                ? nextCcRoleIds
                : [...nextCcRoleIds, prev.currentRoleId];
              return {
                ...step,
                toGroup,
                openedAt: '',
                ccRoleIds: updatedCcRoleIds,
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
            if (!instance.steps || instance.steps.length === 0) {
              if (instance.createdBy !== prev.currentRoleId && !isAdmin) {
                return instance;
              }
            } else {
              const latest = getLatestSentStep(instance);
              if (!latest || !latest.lastStep) {
                return instance;
              }
              if (!isAdmin && (!role || latest.toGroup !== role.group)) {
                return instance;
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
            const shouldBumpRevision =
              action.id === 'csf-aip' || action.id === 'csf-not-approved';
            const draftAttachments = instance.attachments.filter((attachment) => !attachment.stepId);
            const timestamp = Date.now();
            const newStepId = `step-${timestamp}`;
            const attachmentStatuses = action.requiresAttachmentStatus
              ? draftAttachments.map((attachment) => ({
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
              ccRoleIds: action.ccRoleIds || [],
              message: message || '',
            };
            const sentAttachments = instance.attachments.map((attachment) =>
              attachment.stepId ? attachment : { ...attachment, stepId: newStepId }
            );
            const bumpedDraftAttachments = shouldBumpRevision
              ? draftAttachments.map((attachment, index) => ({
                  ...attachment,
                  id: `att-${timestamp}-${index}`,
                  revision: bumpRevision(attachment.revision),
                  status: '',
                  stepId: '',
                }))
              : [];
            const nextAttachments = [...sentAttachments, ...bumpedDraftAttachments];
            const nextStatus = action.closeInstance
              ? instance.status === 'Received'
                ? 'Closed'
                : instance.status
              : 'Sent';
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
                actionFlowEnabled: false,
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

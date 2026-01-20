import React, { createContext, useContext, useMemo, useState } from 'react';
import { initialState } from '../data/mockData.js';
import {
  addDays,
  buildDefaultFormData,
  bumpRevision,
  getLatestSentStep,
  getNextTransmittalNo,
  getTemplateById,
  todayISO,
} from '../utils/workflow.js';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, setState] = useState(initialState);

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
      createInstance({ typeId, templateId, title }) {
        const newId = `inst-${Date.now()}`;
        setState((prev) => {
          const template = getTemplateById(prev.templates, templateId);
          const transmittalNo = getNextTransmittalNo(typeId, prev.instances);
          const formData = buildDefaultFormData(template);
          if (title) {
            formData.title = title;
          }
          const instanceTitle = title || formData.title || `New ${typeId.toUpperCase()}`;
          const newInstance = {
            id: newId,
            transmittalNo,
            typeId,
            templateId,
            title: instanceTitle,
            status: 'Open',
            createdBy: prev.currentRoleId,
            createdAt: todayISO(),
            formData,
            attachments: [],
            steps: [],
          };
          return {
            ...prev,
            instances: [newInstance, ...prev.instances],
          };
        });
        return newId;
      },
      updateFormField(instanceId, key, value) {
        setState((prev) => ({
          ...prev,
          instances: prev.instances.map((instance) => {
            if (instance.id !== instanceId) {
              return instance;
            }
            const nextFormData = { ...instance.formData, [key]: value };
            return {
              ...instance,
              formData: nextFormData,
              title: key === 'title' ? value : instance.title,
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
              id: `att-${Date.now()}`,
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
            const nextSteps = instance.steps.map((step) =>
              step.id === latest.id ? { ...step, openedAt: todayISO() } : step
            );
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
            const sentAt = todayISO();
            const dueDate = action.dueDays ? addDays(sentAt, action.dueDays) : '';
            const shouldBumpRevision =
              instance.typeId === 'csf' &&
              (action.id === 'csf-aip' || action.id === 'csf-not-approved');
            const attachmentStatuses = action.requiresAttachmentStatus
              ? instance.attachments.map((attachment) => ({
                  id: attachment.id,
                  status: attachment.status,
                }))
              : [];
            const newStep = {
              id: `step-${Date.now()}`,
              actionId: action.id,
              actionLabel: action.label,
              fromRoleId: prev.currentRoleId,
              toGroup,
              sentAt,
              openedAt: '',
              dueDate,
              lastStep: action.lastStep,
              requiresAttachmentStatus: action.requiresAttachmentStatus,
              attachmentStatuses,
              message: message || '',
            };
            const nextAttachments = shouldBumpRevision
              ? instance.attachments.map((attachment) => ({
                  ...attachment,
                  revision: bumpRevision(attachment.revision),
                  status: '',
                }))
              : instance.attachments;
            return {
              ...instance,
              status: action.closeInstance ? 'Closed' : 'Open',
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
            types: prev.types.map((type) =>
              type.id === template.typeId
                ? { ...type, templateIds: [newId] }
                : type
            ),
          };
        });
      },
      createTemplate({ typeId, sourceTemplateId, name }) {
        const newId = `tpl-${Date.now()}`;
        setState((prev) => {
          const source = prev.templates.find((item) => item.id === sourceTemplateId);
          if (!source) {
            return prev;
          }
          const copy = {
            ...source,
            id: newId,
            typeId,
            name: name || `${source.name} Copy`,
            published: false,
          };
          return {
            ...prev,
            templates: [...prev.templates, copy],
            types: prev.types.map((type) =>
              type.id === typeId
                ? { ...type, templateIds: [newId] }
                : type
            ),
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

export function todayISO(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function addDays(dateString, days) {
  const base = dateString ? new Date(dateString) : new Date();
  const next = new Date(base);
  next.setDate(base.getDate() + days);
  return todayISO(next);
}

export function getRoleById(roles, roleId) {
  return roles.find((role) => role.id === roleId);
}

export function getRoleGroup(role) {
  if (!role) {
    return '';
  }
  return role.group || role.label || role.id || '';
}

export function getBaseGroupsForStep(step) {
  if (!step) {
    return [];
  }
  const groups = [];
  const addGroup = (group) => {
    if (group && !groups.includes(group)) {
      groups.push(group);
    }
  };
  if (Array.isArray(step.toGroups)) {
    step.toGroups.forEach((group) => addGroup(group));
  }
  if (step.toGroup) {
    addGroup(step.toGroup);
  }
  return groups;
}

export function formatGroupList(groups, fallback = '—') {
  if (!groups || groups.length === 0) {
    return fallback;
  }
  return groups.join(', ');
}

export function getRecipientGroupsForStep(step) {
  if (!step) {
    return [];
  }
  const groups = getBaseGroupsForStep(step);
  const addGroup = (group) => {
    if (group && !groups.includes(group)) {
      groups.push(group);
    }
  };
  (step.delegateGroups || []).forEach((group) => {
    addGroup(group);
  });
  return groups;
}

export function isProjectAdmin(roleId) {
  return roleId === 'project-admin';
}

export function canInitiateTemplate(template, roleId) {
  if (!template) {
    return false;
  }
  if (isProjectAdmin(roleId)) {
    return true;
  }
  const allowed = template.initiatorRoleIds;
  if (!Array.isArray(allowed) || allowed.length === 0) {
    return true;
  }
  return allowed.includes(roleId);
}

export function isInitiatorRole(template, roleId) {
  if (!template) {
    return false;
  }
  const allowed = template.initiatorRoleIds;
  if (!Array.isArray(allowed) || allowed.length === 0) {
    return false;
  }
  return allowed.includes(roleId);
}

export function canRoleStartDraftInstance(instance, template, roleId) {
  if (!instance || !template) {
    return false;
  }
  if (isProjectAdmin(roleId)) {
    return true;
  }
  if (!Array.isArray(instance.steps) || instance.steps.length > 0) {
    return false;
  }
  const startableActions = getAvailableActionsForInstance(template, roleId, instance);
  return startableActions.length > 0;
}

export function isMyCreatedInstance(instance, roleId, templates = []) {
  if (!instance) {
    return false;
  }
  if (instance.createdBy === roleId) {
    return true;
  }
  const template = getTemplateById(templates, instance.templateId);
  return canRoleStartDraftInstance(instance, template, roleId);
}

export function canViewInstance(instance, roleId, roles, templates = []) {
  if (!instance) {
    return false;
  }
  if (isProjectAdmin(roleId)) {
    return true;
  }
  if (instance.createdBy === roleId) {
    return true;
  }
  const template = getTemplateById(templates, instance.templateId);
  if (canRoleStartDraftInstance(instance, template, roleId)) {
    return true;
  }
  const role = getRoleById(roles, roleId);
  if (!role || !instance.steps) {
    return false;
  }
  const roleGroup = getRoleGroup(role);
  return instance.steps.some(
    (step) =>
      step.fromRoleId === roleId ||
      getRecipientGroupsForStep(step).includes(roleGroup) ||
      (step.ccRoleIds || []).includes(roleId)
  );
}

export function getTemplateById(templates, templateId) {
  return templates.find((template) => template.id === templateId);
}

export function getLoopCount(template, instance) {
  if (!instance) {
    return 0;
  }
  if (!template?.actionFlowEnabled) {
    return 1;
  }
  const actions = template?.actions || [];
  const startIds = new Set(actions.filter((action) => action.isStart).map((action) => action.id));
  if (startIds.size === 0) {
    return 1;
  }
  const steps = instance.steps || [];
  if (steps.length === 0) {
    return 1;
  }
  const count = steps.reduce(
    (total, step) => total + (startIds.has(step.actionId) ? 1 : 0),
    0
  );
  return Math.max(count, 1);
}

export function getLatestSentStep(instance) {
  if (!instance.steps || instance.steps.length === 0) {
    return null;
  }
  return instance.steps[instance.steps.length - 1];
}

export function getCurrentTo(instance) {
  const latest = getLatestSentStep(instance);
  if (!latest) {
    return '—';
  }
  return formatGroupList(getRecipientGroupsForStep(latest));
}

export function getDueDate(instance) {
  const latest = getLatestSentStep(instance);
  return latest ? latest.dueDate : '';
}

export function isOverdue(instance) {
  const dueDate = getDueDate(instance);
  if (!dueDate || instance.status === 'Closed') {
    return false;
  }
  return dueDate < todayISO();
}

export function isInbox(instance, currentRoleId, roles) {
  if (instance.status === 'Closed') {
    return false;
  }
  const role = getRoleById(roles, currentRoleId);
  const latest = getLatestSentStep(instance);
  if (!role || !latest) {
    return false;
  }
  if (!latest.lastStep) {
    return false;
  }
  const roleGroup = getRoleGroup(role);
  return getRecipientGroupsForStep(latest).includes(roleGroup);
}

export function isUnread(instance, currentRoleId, roles) {
  const latest = getLatestSentStep(instance);
  if (!latest) {
    return false;
  }
  return isInbox(instance, currentRoleId, roles) && !latest.openedAt;
}

export function getAvailableActions(template, roleId) {
  if (!template || !template.actions) {
    return [];
  }
  if (isProjectAdmin(roleId)) {
    return template.actions;
  }
  return template.actions.filter((action) => action.allowedRoles.includes(roleId));
}

export function getAvailableActionsForInstance(template, roleId, instance) {
  const allowed = getAvailableActions(template, roleId);
  if (!template || !template.actionFlowEnabled) {
    return allowed;
  }
  const actions = template.actions || [];
  if (!instance || !instance.steps || instance.steps.length === 0) {
    const startActions = actions.filter((action) => action.isStart);
    const startIds =
      startActions.length > 0
        ? startActions.map((action) => action.id)
        : actions
            .map((action) => action.id)
            .filter((id) => !actions.some((action) => (action.nextActionIds || []).includes(id)));
    return allowed.filter((action) => startIds.includes(action.id));
  }
  const latest = getLatestSentStep(instance);
  if (!latest || !latest.lastStep) {
    return [];
  }
  const fromAction = actions.find((action) => action.id === latest.actionId);
  const nextIds = new Set(fromAction?.nextActionIds || []);
  return allowed.filter((action) => nextIds.has(action.id));
}

export function getNextTransmittalNo(template, instances) {
  const rawPrefix = template?.code || template?.name || template?.id || 'DOC';
  const normalized = String(rawPrefix).trim();
  const prefix =
    normalized
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'DOC';
  const year = new Date().getFullYear();
  const matcher = new RegExp(`^${prefix}-${year}-(\\d{4})$`);
  let max = 0;
  instances.forEach((instance) => {
    const match = instance.transmittalNo.match(matcher);
    if (match) {
      const value = Number(match[1]);
      if (value > max) {
        max = value;
      }
    }
  });
  const next = String(max + 1).padStart(4, '0');
  return `${prefix}-${year}-${next}`;
}

export function buildDefaultFormData(template) {
  if (!template) {
    return {};
  }
  const data = {};
  template.schema.forEach((field) => {
    if (field.defaultValue !== undefined) {
      data[field.key] = field.defaultValue;
      return;
    }
    if (field.type === 'boolean') {
      data[field.key] = false;
      return;
    }
    if (field.type === 'number') {
      data[field.key] = 0;
      return;
    }
    if (field.type === 'select' && field.options && field.options.length > 0) {
      data[field.key] = field.options[0];
      return;
    }
    data[field.key] = '';
  });
  return data;
}

export function buildDefaultCommonData(commonFields = []) {
  const data = {};
  commonFields.forEach((field) => {
    if (field.defaultValue !== undefined) {
      data[field.key] = field.defaultValue;
      return;
    }
    if (field.type === 'boolean') {
      data[field.key] = false;
      return;
    }
    if (field.type === 'number') {
      data[field.key] = 0;
      return;
    }
    if (field.type === 'select' && field.options && field.options.length > 0) {
      data[field.key] = field.options[0];
      return;
    }
    data[field.key] = '';
  });
  return data;
}

function isRoleAllowed(list, roleId) {
  if (!list || list.length === 0) {
    return true;
  }
  return list.includes(roleId);
}

function isActionAllowed(list, actionId) {
  if (!list || list.length === 0) {
    return true;
  }
  if (!actionId) {
    return false;
  }
  return list.includes(actionId);
}

export function getFieldAccess(field, { roleId, actionId, canEdit, requireEditable } = {}) {
  const isAdmin = isProjectAdmin(roleId);
  const visible = isAdmin || isRoleAllowed(field.visibleRoles, roleId);
  const hasEditableConfig =
    (Array.isArray(field.editableRoles) && field.editableRoles.length > 0) ||
    (Array.isArray(field.editableActionIds) && field.editableActionIds.length > 0);
  const editableByConfig =
    isRoleAllowed(field.editableRoles, roleId) &&
    isActionAllowed(field.editableActionIds, actionId);
  const editable =
    Boolean(canEdit) &&
    visible &&
    (isAdmin ||
      (requireEditable ? (hasEditableConfig ? editableByConfig : true) : editableByConfig));
  const required = Boolean(field.required) && editable;
  return { visible, editable, required };
}

export function areAttachmentStatusesComplete(instance, stepId = null) {
  if (!instance.attachments || instance.attachments.length === 0) {
    return true;
  }
  const attachmentsForCheck = stepId
    ? instance.attachments.filter((attachment) => attachment.stepId === stepId)
    : instance.attachments.filter((attachment) => !attachment.stepId);
  if (attachmentsForCheck.length === 0) {
    return true;
  }
  return attachmentsForCheck.every((attachment) => attachment.status);
}

export function isPartialForStep(instance, step) {
  if (!step || !step.requiresAttachmentStatus) {
    return false;
  }
  const stepAttachments = instance.attachments
    ? instance.attachments.filter((attachment) => attachment.stepId === step.id)
    : [];
  const statuses = stepAttachments.length > 0
    ? stepAttachments.map((attachment) => attachment.status)
    : step.attachmentStatuses
      ? step.attachmentStatuses.map((item) => item.status)
      : [];
  if (!statuses || statuses.length === 0) {
    return false;
  }
  return statuses.some((status) => status && status !== 'Approved');
}

export function bumpVersion(version) {
  if (!version) {
    return 'A';
  }
  const text = String(version).trim();
  if (!text) {
    return 'A';
  }
  const lastChar = text[text.length - 1];
  if (/[a-z]/.test(lastChar)) {
    const next = String.fromCharCode(lastChar.charCodeAt(0) + 1);
    return text.slice(0, -1) + next;
  }
  if (/[A-Z]/.test(lastChar)) {
    const next = String.fromCharCode(lastChar.charCodeAt(0) + 1);
    return text.slice(0, -1) + next;
  }
  if (/\d/.test(lastChar)) {
    const num = Number(text);
    if (!Number.isNaN(num)) {
      return String(num + 1);
    }
  }
  return text;
}

export function getPublishIssues(template, roles = []) {
  const issues = [];
  if (!template.actions || template.actions.length === 0) {
    issues.push('At least one action is required.');
  }
  template.actions.forEach((action) => {
    if (!action.toCandidateGroups || action.toCandidateGroups.length === 0) {
      issues.push(`Action "${action.label}" needs at least one recipient group.`);
    }
    if (action.closeInstance && action.lastStep) {
      issues.push(`Action "${action.label}" cannot be both close form and require reply.`);
    }
    if (action.requiresAttachmentStatus && (!action.statusSet || action.statusSet.length === 0)) {
      issues.push(`Action "${action.label}" requires attachment statuses.`);
    }
  });
  if (template.actionFlowEnabled) {
    const actions = template.actions || [];
    const actionIds = actions.map((action) => action.id);
    const actionIdSet = new Set(actionIds);
    const roleGroupMap = new Map(roles.map((role) => [role.id, getRoleGroup(role)]));
    const roleLabelMap = new Map(roles.map((role) => [role.id, role.label || role.id]));
    const getGroupForRole = (roleId) => roleGroupMap.get(roleId) || roleId;
    const getLabelForRole = (roleId) => roleLabelMap.get(roleId) || roleId;
    const startActions = actions.filter((action) => action.isStart);
    if (startActions.length === 0) {
      issues.push('Exactly one start action is required when flow is enabled.');
    } else if (startActions.length > 1) {
      issues.push('Only one start action is allowed when flow is enabled.');
    }
    if (!actions.some((action) => action.closeInstance)) {
      issues.push('At least one action must close the form when flow is enabled.');
    }

    actions.forEach((action) => {
      const nextIds = action.nextActionIds || [];
      const recipientGroups = new Set(action.toCandidateGroups || []);
      if (nextIds.includes(action.id)) {
        issues.push(`Action "${action.label}" cannot link to itself.`);
      }
      nextIds.forEach((id) => {
        if (!actionIdSet.has(id)) {
          issues.push(`Action "${action.label}" links to missing action "${id}".`);
          return;
        }
        const nextAction = actions.find((item) => item.id === id);
        if (!nextAction) {
          return;
        }
        const missingRoles = (nextAction.allowedRoles || []).filter(
          (roleId) => !recipientGroups.has(getGroupForRole(roleId))
        );
        if (missingRoles.length > 0) {
          const missingLabels = missingRoles.map(getLabelForRole).join(', ');
          issues.push(
            `Action "${action.label}" recipients must include initiators of next action "${nextAction.label}" (missing: ${missingLabels}).`
          );
        }
      });
      if (action.closeInstance && nextIds.length > 0) {
        issues.push(`Action "${action.label}" closes form so it should not have next actions.`);
      }
      if (action.lastStep && nextIds.length === 0) {
        issues.push(`Action "${action.label}" requires reply but has no next actions.`);
      }
      if (!action.lastStep && nextIds.length > 0) {
        issues.push(`Action "${action.label}" does not require reply so it should not have next actions.`);
      }
    });
  }
  return issues;
}

const isEmptyValue = (value) =>
  value === undefined || value === null || value === '' || Number.isNaN(value);

export function validateCommonFields(fields = [], values = {}) {
  const errors = {};
  fields.forEach((field) => {
    if (field.required === false) {
      return;
    }
    const value = values[field.key];
    if (isEmptyValue(value)) {
      const label = field.label || field.key;
      errors[field.key] = `${label} is required.`;
    }
  });
  return errors;
}

export function validateFormData(template, formData, context = {}) {
  const errors = {};
  if (!template) {
    return errors;
  }
  const commonFieldKeys = new Set(context.commonFieldKeys || []);
  const visibleFieldKeys = new Set();
  if (template.layout && Array.isArray(template.layout.sections)) {
    template.layout.sections.forEach((section) => {
      if (section.visibleWhen) {
        const expected = section.visibleWhen.equals;
        const current = formData[section.visibleWhen.field];
        if (current !== expected) {
          return;
        }
      }
      (section.fields || []).forEach((fieldKey) => visibleFieldKeys.add(fieldKey));
    });
  }
  template.schema.forEach((field) => {
    if (commonFieldKeys.has(field.key)) {
      return;
    }
    if (visibleFieldKeys.size > 0 && !visibleFieldKeys.has(field.key)) {
      return;
    }
    const access = getFieldAccess(field, context);
    if (!access.editable) {
      return;
    }
    const value = formData[field.key];
    const label = field.label || field.key;
    const isEmpty = isEmptyValue(value);

    if (access.required && isEmpty) {
      errors[field.key] = `${label} is required.`;
      return;
    }

    if (field.type === 'text' || field.type === 'textarea') {
      const textValue = value ? String(value) : '';
      if (field.minLength !== undefined && textValue.length < field.minLength) {
        errors[field.key] = `${label} must be at least ${field.minLength} characters.`;
        return;
      }
      if (field.maxLength !== undefined && textValue.length > field.maxLength) {
        errors[field.key] = `${label} must be under ${field.maxLength} characters.`;
        return;
      }
    }

    if (field.type === 'number' && !isEmpty) {
      const numeric = Number(value);
      if (field.min !== undefined && numeric < field.min) {
        errors[field.key] = `${label} must be at least ${field.min}.`;
        return;
      }
      if (field.max !== undefined && numeric > field.max) {
        errors[field.key] = `${label} must be at most ${field.max}.`;
      }
    }
  });
  return errors;
}

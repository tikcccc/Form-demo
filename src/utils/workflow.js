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

export function getTypeById(types, typeId) {
  return types.find((type) => type.id === typeId);
}

export function getTemplateById(templates, templateId) {
  return templates.find((template) => template.id === templateId);
}

export function getLatestSentStep(instance) {
  if (!instance.steps || instance.steps.length === 0) {
    return null;
  }
  return instance.steps[instance.steps.length - 1];
}

export function getCurrentTo(instance) {
  const latest = getLatestSentStep(instance);
  return latest ? latest.toGroup : '—';
}

export function getDueDate(instance) {
  const latest = getLatestSentStep(instance);
  return latest ? latest.dueDate : '';
}

export function isOverdue(instance) {
  const dueDate = getDueDate(instance);
  if (!dueDate || instance.status !== 'Open') {
    return false;
  }
  return dueDate < todayISO();
}

export function isInbox(instance, currentRoleId, roles) {
  if (instance.status !== 'Open') {
    return false;
  }
  const role = getRoleById(roles, currentRoleId);
  const latest = getLatestSentStep(instance);
  if (!role || !latest) {
    return false;
  }
  return latest.toGroup === role.group;
}

export function isUnread(instance, currentRoleId, roles) {
  const latest = getLatestSentStep(instance);
  if (!latest) {
    return false;
  }
  return isInbox(instance, currentRoleId, roles) && !latest.openedAt;
}

export function getAvailableActions(template, roleId) {
  if (!template) {
    return [];
  }
  return template.actions.filter((action) => action.allowedRoles.includes(roleId));
}

export function getNextTransmittalNo(typeId, instances) {
  const prefix = typeId.toUpperCase();
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

export function areAttachmentStatusesComplete(instance) {
  if (!instance.attachments || instance.attachments.length === 0) {
    return true;
  }
  return instance.attachments.every((attachment) => attachment.status);
}

export function isPartialForStep(instance, step) {
  if (!step || !step.requiresAttachmentStatus) {
    return false;
  }
  if (!instance.attachments || instance.attachments.length === 0) {
    return false;
  }
  return instance.attachments.some((attachment) => attachment.status && attachment.status !== 'Approved');
}

export function getPublishIssues(template) {
  const issues = [];
  if (!template.actions || template.actions.length === 0) {
    issues.push('At least one action is required.');
  }
  template.actions.forEach((action) => {
    if (!action.toCandidateGroups || action.toCandidateGroups.length === 0) {
      issues.push(`Action "${action.label}" needs at least one recipient group.`);
    }
    if (action.closeInstance && action.lastStep) {
      issues.push(`Action "${action.label}" cannot be both close and last step.`);
    }
    if (action.requiresAttachmentStatus && (!action.statusSet || action.statusSet.length === 0)) {
      issues.push(`Action "${action.label}" requires attachment statuses.`);
    }
  });
  return issues;
}

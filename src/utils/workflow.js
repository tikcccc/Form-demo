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
  if (!latest.lastStep) {
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
  const statuses = step.attachmentStatuses
    ? step.attachmentStatuses.map((item) => item.status)
    : instance.attachments.map((attachment) => attachment.status);
  if (!statuses || statuses.length === 0) {
    return false;
  }
  return statuses.some((status) => status && status !== 'Approved');
}

export function bumpRevision(revision) {
  if (!revision) {
    return 'A';
  }
  const text = String(revision).trim();
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
      issues.push(`Action "${action.label}" cannot be both close workflow and require reply.`);
    }
    if (action.requiresAttachmentStatus && (!action.statusSet || action.statusSet.length === 0)) {
      issues.push(`Action "${action.label}" requires attachment statuses.`);
    }
  });
  return issues;
}

export function validateFormData(template, formData) {
  const errors = {};
  if (!template) {
    return errors;
  }
  template.schema.forEach((field) => {
    const value = formData[field.key];
    const label = field.label || field.key;
    const isEmpty =
      value === undefined || value === null || value === '' || Number.isNaN(value);

    if (field.required && isEmpty) {
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

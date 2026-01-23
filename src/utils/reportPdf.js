import { jsPDF } from 'jspdf';
import {
  formatGroupList,
  getBaseGroupsForStep,
  getCurrentTo,
  getDueDate,
  getLoopCount,
  getRoleById,
} from './workflow.js';

const PAGE_MARGIN = 16;
const BODY_FONT_SIZE = 10;
const SECTION_FONT_SIZE = 12;
const TITLE_FONT_SIZE = 18;
const LINE_HEIGHT = 5;
const LABEL_WIDTH = 40;
const NESTED_LABEL_WIDTH = 28;

const formatValue = (field, value) => {
  if (value === undefined || value === null || value === '' || Number.isNaN(value)) {
    return 'N/A';
  }
  if (field?.type === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  return String(value);
};

const sanitizeFileName = (name) => {
  const normalized = String(name || '').toLowerCase();
  const cleaned = normalized.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return cleaned || 'form-report';
};

export function exportFormReportPdf({
  instance,
  template,
  commonFields = [],
  roles = [],
  formData,
}) {
  if (!instance || !template) {
    return;
  }

  const data = formData || instance.formData || {};
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - PAGE_MARGIN * 2;
  let y = PAGE_MARGIN;

  const ensureSpace = (height) => {
    if (y + height <= pageHeight - PAGE_MARGIN) {
      return;
    }
    doc.addPage();
    y = PAGE_MARGIN;
  };

  const setFont = (style, size) => {
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
  };

  const wrapText = (text, maxWidth) => {
    const normalized = text === undefined || text === null ? '' : String(text);
    const compact = normalized.replace(/\r?\n/g, ' ').trim();
    return doc.splitTextToSize(compact || 'N/A', maxWidth);
  };

  const addSectionTitle = (title) => {
    ensureSpace(SECTION_FONT_SIZE + LINE_HEIGHT);
    setFont('bold', SECTION_FONT_SIZE);
    doc.text(title, PAGE_MARGIN, y);
    y += LINE_HEIGHT;
    doc.setDrawColor(220);
    doc.line(PAGE_MARGIN, y, pageWidth - PAGE_MARGIN, y);
    y += LINE_HEIGHT - 1;
  };

  const addSubheading = (title) => {
    ensureSpace(LINE_HEIGHT * 2);
    setFont('bold', BODY_FONT_SIZE + 1);
    doc.text(title, PAGE_MARGIN, y);
    y += LINE_HEIGHT + 1;
  };

  const addKeyValueRow = (label, value, indent = 0, labelWidth = LABEL_WIDTH) => {
    const labelText = `${label}:`;
    const valueWidth = contentWidth - indent - labelWidth;
    const lines = wrapText(value, valueWidth);
    const rowHeight = LINE_HEIGHT * lines.length;
    ensureSpace(rowHeight);
    setFont('bold', BODY_FONT_SIZE);
    doc.text(labelText, PAGE_MARGIN + indent, y);
    setFont('normal', BODY_FONT_SIZE);
    lines.forEach((line, index) => {
      doc.text(line, PAGE_MARGIN + indent + labelWidth, y + LINE_HEIGHT * index);
    });
    y += rowHeight;
  };

  const addListItem = (text, indent = 4) => {
    const bullet = '- ';
    const lines = wrapText(`${bullet}${text}`, contentWidth - indent);
    const height = LINE_HEIGHT * lines.length;
    ensureSpace(height);
    setFont('normal', BODY_FONT_SIZE);
    lines.forEach((line) => {
      doc.text(line, PAGE_MARGIN + indent, y);
      y += LINE_HEIGHT;
    });
  };

  const addDivider = () => {
    ensureSpace(LINE_HEIGHT);
    doc.setDrawColor(230);
    doc.line(PAGE_MARGIN, y, pageWidth - PAGE_MARGIN, y);
    y += LINE_HEIGHT - 1;
  };

  const buildColumns = (columns, gap = 2) => {
    let x = PAGE_MARGIN;
    return columns.map((column) => {
      const next = { ...column, x };
      x += column.width + gap;
      return next;
    });
  };

  const addTableHeader = (columns) => {
    ensureSpace(LINE_HEIGHT * 2);
    setFont('bold', BODY_FONT_SIZE);
    columns.forEach((column) => {
      doc.text(column.title, column.x, y);
    });
    y += LINE_HEIGHT;
    doc.setDrawColor(220);
    doc.line(PAGE_MARGIN, y, pageWidth - PAGE_MARGIN, y);
    y += LINE_HEIGHT - 1;
  };

  const addTableRow = (columns, values) => {
    const linesPerColumn = columns.map((column) => {
      const value = values[column.key];
      return wrapText(value === undefined || value === null ? 'N/A' : value, column.width - 1);
    });
    const maxLines = Math.max(...linesPerColumn.map((lines) => lines.length));
    const rowHeight = LINE_HEIGHT * maxLines;
    ensureSpace(rowHeight);
    setFont('normal', BODY_FONT_SIZE);
    columns.forEach((column, index) => {
      linesPerColumn[index].forEach((line, lineIndex) => {
        doc.text(line, column.x, y + LINE_HEIGHT * lineIndex);
      });
    });
    y += rowHeight + 1;
  };

  setFont('bold', TITLE_FONT_SIZE);
  doc.text('Form Report', PAGE_MARGIN, y);
  y += LINE_HEIGHT + 3;

  setFont('normal', BODY_FONT_SIZE + 1);
  doc.text(
    `${instance.transmittalNo} - ${template.name || template.id}`,
    PAGE_MARGIN,
    y
  );
  y += LINE_HEIGHT + 1;

  setFont('normal', BODY_FONT_SIZE);
  const titleValue = data.title || instance.title || 'N/A';
  doc.text(`Form Title: ${titleValue}`, PAGE_MARGIN, y);
  y += LINE_HEIGHT + 1;

  doc.setDrawColor(200);
  doc.line(PAGE_MARGIN, y, pageWidth - PAGE_MARGIN, y);
  y += LINE_HEIGHT;

  const createdByLabel = getRoleById(roles, instance.createdBy)?.label || instance.createdBy;

  addSectionTitle('Summary');
  addKeyValueRow('Template', template.name || template.id);
  addKeyValueRow('Transmittal', instance.transmittalNo);
  addKeyValueRow('Status', instance.status);
  addKeyValueRow('Created By', createdByLabel);
  addKeyValueRow('Created At', instance.createdAt);
  addKeyValueRow('Current To', getCurrentTo(instance));
  addKeyValueRow('Due Date', getDueDate(instance) || 'N/A');
  addKeyValueRow('Loop', String(getLoopCount(template, instance) || 1));

  addSectionTitle('Shared Fields');
  if (!commonFields || commonFields.length === 0) {
    addKeyValueRow('Fields', 'None');
  } else {
    commonFields.forEach((field) => {
      addKeyValueRow(field.label || field.key, formatValue(field, data[field.key]));
    });
  }

  const schema = template.schema || [];
  const schemaMap = new Map(schema.map((field) => [field.key, field]));
  const commonFieldKeys = new Set(commonFields.map((field) => field.key));
  const includedKeys = new Set();
  const hasSections =
    template.layout && Array.isArray(template.layout.sections) && template.layout.sections.length > 0;

  addSectionTitle('Form Fields');
  if (hasSections) {
    template.layout.sections.forEach((section) => {
      const isVisible = section.visibleWhen
        ? data[section.visibleWhen.field] === section.visibleWhen.equals
        : true;
      if (!isVisible) {
        return;
      }
      const fields = (section.fields || [])
        .map((key) => schemaMap.get(key))
        .filter((field) => field && !commonFieldKeys.has(field.key));
      if (fields.length === 0) {
        return;
      }
      addSubheading(section.name || 'Section');
      fields.forEach((field) => {
        includedKeys.add(field.key);
        addKeyValueRow(
          field.label || field.key,
          formatValue(field, data[field.key]),
          2
        );
      });
    });
  } else {
    schema
      .filter((field) => !commonFieldKeys.has(field.key))
      .forEach((field) => {
        includedKeys.add(field.key);
        addKeyValueRow(field.label || field.key, formatValue(field, data[field.key]));
      });
  }

  const remainingFields = schema.filter(
    (field) => !commonFieldKeys.has(field.key) && !includedKeys.has(field.key)
  );
  if (remainingFields.length > 0) {
    addSubheading('Additional Fields');
    remainingFields.forEach((field) => {
      addKeyValueRow(
        field.label || field.key,
        formatValue(field, data[field.key]),
        2
      );
    });
  }

  addSectionTitle('Attachments');
  const attachments = instance.attachments || [];
  if (attachments.length === 0) {
    addKeyValueRow('Files', 'None');
  } else {
    const draftLabel = 'Draft (Unsent)';
    const stepLabelMap = new Map();
    (instance.steps || []).forEach((step, index) => {
      const actionLabel = step.actionLabel || step.actionId || 'Step';
      const dateLabel = step.sentAt ? ` (${step.sentAt})` : '';
      const label = `Step ${index + 1} - ${actionLabel}${dateLabel}`;
      stepLabelMap.set(step.id, label);
    });
    const grouped = new Map();
    attachments.forEach((attachment) => {
      const stepLabel = attachment.stepId
        ? stepLabelMap.get(attachment.stepId) || 'Step Attachment'
        : draftLabel;
      if (!grouped.has(stepLabel)) {
        grouped.set(stepLabel, []);
      }
      grouped.get(stepLabel).push(attachment);
    });
    const columns = buildColumns([
      { title: 'File', key: 'name', width: 80 },
      { title: 'Type', key: 'type', width: 16 },
      { title: 'Ver', key: 'version', width: 12 },
      { title: 'Status', key: 'status', width: 34 },
      { title: 'Size', key: 'size', width: 18 },
    ]);
    const groupOrder = [];
    if (grouped.has(draftLabel)) {
      groupOrder.push(draftLabel);
    }
    (instance.steps || []).forEach((step) => {
      const label = stepLabelMap.get(step.id);
      if (label && grouped.has(label)) {
        groupOrder.push(label);
      }
    });
    grouped.forEach((_, label) => {
      if (!groupOrder.includes(label)) {
        groupOrder.push(label);
      }
    });
    groupOrder.forEach((label, index) => {
      const items = grouped.get(label);
      if (!items || items.length === 0) {
        return;
      }
      addSubheading(label);
      addTableHeader(columns);
      items.forEach((attachment) => {
        addTableRow(columns, {
          name: attachment.name || 'N/A',
          type: attachment.type || 'N/A',
          version: attachment.version ? `v${attachment.version}` : 'N/A',
          status: attachment.status || 'N/A',
          size: attachment.size || 'N/A',
        });
      });
      if (index < groupOrder.length - 1) {
        addDivider();
      }
    });
  }

  addSectionTitle('Timeline');
  const steps = instance.steps || [];
  if (steps.length === 0) {
    addKeyValueRow('Steps', 'None');
  } else {
    steps.forEach((step, index) => {
      const actionLabel = step.actionLabel || step.actionId || 'Step';
      const fromLabel = getRoleById(roles, step.fromRoleId)?.label || step.fromRoleId;
      const toGroups = formatGroupList(getBaseGroupsForStep(step), 'N/A');
      const ccLabels = (step.ccRoleIds || []).map(
        (roleId) => getRoleById(roles, roleId)?.label || roleId
      );
      const delegateGroups = formatGroupList(step.delegateGroups || [], 'N/A');
      const sentAt = step.sentAt || step.sentAtTime || 'N/A';
      const openedAt = step.openedAt || 'N/A';
      const dueDate = step.dueDate || 'N/A';
      addSubheading(`Step ${index + 1} - ${actionLabel}`);
      addKeyValueRow('From', fromLabel, 2, NESTED_LABEL_WIDTH);
      addKeyValueRow('To', toGroups, 2, NESTED_LABEL_WIDTH);
      if (ccLabels.length > 0) {
        addKeyValueRow('CC', formatGroupList(ccLabels, 'N/A'), 2, NESTED_LABEL_WIDTH);
      }
      if (step.delegateGroups && step.delegateGroups.length > 0) {
        addKeyValueRow('Delegated', delegateGroups, 2, NESTED_LABEL_WIDTH);
      }
      addKeyValueRow('Sent', sentAt, 2, NESTED_LABEL_WIDTH);
      if (step.openedAt) {
        addKeyValueRow('Opened', openedAt, 2, NESTED_LABEL_WIDTH);
      }
      if (step.dueDate) {
        addKeyValueRow('Due', dueDate, 2, NESTED_LABEL_WIDTH);
      }
      if (step.requiresAttachmentStatus !== undefined) {
        addKeyValueRow(
          'Attachment Status',
          step.requiresAttachmentStatus ? 'Required' : 'Not required',
          2,
          NESTED_LABEL_WIDTH
        );
      }
      if (step.message) {
        addKeyValueRow('Message', step.message, 2, NESTED_LABEL_WIDTH);
      }
      if (index < steps.length - 1) {
        addDivider();
      }
    });
  }

  const baseName = `${instance.transmittalNo}-${template.name || template.id}-report`;
  doc.save(`${sanitizeFileName(baseName)}.pdf`);
}

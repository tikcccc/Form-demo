import React from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Popover,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from '@arco-design/web-react';
import { buildDefaultFormData, getFieldAccess } from '../utils/workflow.js';

export default function DynamicForm({
  template,
  formData = {},
  onChange,
  errors = {},
  showValidation = false,
  roleId = '',
  actionId = '',
  canEdit = false,
  requireEditable = false,
  commonFields = [],
  commonEditable = false,
  formHistory = [],
  roles = [],
}) {
  const fieldMap = React.useMemo(() => {
    if (!template?.schema) {
      return new Map();
    }
    return new Map(template.schema.map((field) => [field.key, field]));
  }, [template]);
  const commonFieldKeys = React.useMemo(
    () => new Set(commonFields.map((field) => field.key)),
    [commonFields]
  );
  const commonFieldMap = React.useMemo(
    () => new Map(commonFields.map((field) => [field.key, field])),
    [commonFields]
  );
  const defaultFormData = React.useMemo(() => buildDefaultFormData(template), [template]);
  const accessContext = { roleId, actionId, canEdit, requireEditable };
  const [historyFieldKey, setHistoryFieldKey] = React.useState('');

  const roleLabelMap = React.useMemo(
    () =>
      new Map(roles.map((role) => [role.id, role.label || role.group || role.id])),
    [roles]
  );
  const historyByField = React.useMemo(() => {
    const map = new Map();
    (formHistory || []).forEach((entry) => {
      if (!entry || !entry.fieldKey) {
        return;
      }
      const list = map.get(entry.fieldKey) || [];
      list.push(entry);
      map.set(entry.fieldKey, list);
    });
    return map;
  }, [formHistory]);

  React.useEffect(() => {
    if (!template?.layout?.sections || typeof onChange !== 'function') {
      return;
    }
    template.layout.sections.forEach((section) => {
      if (!section.visibleWhen) {
        return;
      }
      const expected = section.visibleWhen.equals;
      const current = formData[section.visibleWhen.field];
      if (current === expected) {
        return;
      }
      (section.fields || []).forEach((fieldKey) => {
        if (commonFieldKeys.has(fieldKey)) {
          return;
        }
        if (fieldKey === section.visibleWhen.field) {
          return;
        }
        if (!fieldMap.has(fieldKey)) {
          return;
        }
        const nextValue = defaultFormData[fieldKey];
        if (!Object.is(formData[fieldKey], nextValue)) {
          onChange(fieldKey, nextValue);
        }
      });
    });
  }, [template, formData, onChange, commonFieldKeys, fieldMap, defaultFormData]);

  if (!template) {
    return null;
  }

  const formatHistoryTime = (value) => {
    if (!value) {
      return 'N/A';
    }
    const text = String(value);
    return text.includes('T') ? text.replace('T', ' ').replace('Z', '') : text;
  };

  const formatHistoryValue = (field, value) => {
    if (value === undefined || value === null || value === '' || Number.isNaN(value)) {
      return 'N/A';
    }
    if (field?.type === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    return String(value);
  };

  const getFieldByKey = (key) => commonFieldMap.get(key) || fieldMap.get(key);

  const renderHistoryPreview = (entries, field) => {
    if (!entries || entries.length === 0) {
      return <Typography.Text className="muted">No history available.</Typography.Text>;
    }
    const recent = entries.slice(-2).reverse();
    return (
      <Space direction="vertical" size={4} style={{ maxWidth: 260 }}>
        {recent.map((entry) => {
          const roleLabel = roleLabelMap.get(entry.byRoleId) || entry.byRoleId || 'N/A';
          return (
            <Space key={entry.id} direction="vertical" size={2}>
              <Typography.Text>{formatHistoryTime(entry.at)}</Typography.Text>
              <Typography.Text className="muted">
                {formatHistoryValue(field, entry.from)} -> {formatHistoryValue(field, entry.to)}
              </Typography.Text>
              <Typography.Text className="muted">{`By ${roleLabel}`}</Typography.Text>
            </Space>
          );
        })}
        {entries.length > 2 && (
          <Typography.Text className="muted">{`View all ${entries.length} records`}</Typography.Text>
        )}
      </Space>
    );
  };

  const renderFieldLabel = (field) => {
    const label = field.label || field.key;
    const entries = historyByField.get(field.key) || [];
    if (entries.length === 0) {
      return label;
    }
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span>{label}</span>
        <Tag color="blue">{`Updated ${entries.length}`}</Tag>
        <Popover
          trigger="hover"
          position="top"
          content={renderHistoryPreview(entries, field)}
        >
          <Button
            type="text"
            size="mini"
            style={{ padding: 0 }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setHistoryFieldKey(field.key);
            }}
          >
            History
          </Button>
        </Popover>
      </span>
    );
  };

  const historyEntries = historyFieldKey ? historyByField.get(historyFieldKey) || [] : [];
  const historyField = historyFieldKey ? getFieldByKey(historyFieldKey) : null;
  const historyLabel = historyField?.label || historyField?.key || historyFieldKey;
  const historyRows = historyEntries
    .slice()
    .sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')))
    .map((entry, index) => {
      const roleLabel = roleLabelMap.get(entry.byRoleId) || entry.byRoleId || 'N/A';
      return {
        key: entry.id || `${entry.fieldKey}-${index}`,
        time: formatHistoryTime(entry.at),
        step: entry.stepLabel || 'N/A',
        by: roleLabel,
        change: `${formatHistoryValue(historyField, entry.from)} -> ${formatHistoryValue(
          historyField,
          entry.to
        )}`,
      };
    });

  const historyColumns = [
    { title: 'Time', dataIndex: 'time', width: 160 },
    { title: 'Step', dataIndex: 'step', width: 160 },
    { title: 'By', dataIndex: 'by', width: 140 },
    { title: 'Change', dataIndex: 'change' },
  ];

  const renderInput = (field, access) => {
    const value = formData[field.key];
    const commonProps = {
      disabled: !access.editable,
    };

    if (field.type === 'textarea') {
      return (
        <Input.TextArea
          value={value}
          onChange={(val) => onChange(field.key, val)}
          autoSize
          {...commonProps}
        />
      );
    }

    if (field.type === 'number') {
      return (
        <InputNumber
          value={value}
          onChange={(val) => onChange(field.key, val)}
          {...commonProps}
        />
      );
    }

    if (field.type === 'select') {
      return (
        <Select
          value={value}
          onChange={(val) => onChange(field.key, val)}
          options={(field.options || []).map((option) => ({
            value: option,
            label: option,
          }))}
          {...commonProps}
        />
      );
    }

    if (field.type === 'boolean') {
      return (
        <Switch
          checked={Boolean(value)}
          onChange={(val) => onChange(field.key, val)}
          disabled={!access.editable}
        />
      );
    }

    return (
      <Input
        value={value}
        onChange={(val) => onChange(field.key, val)}
        {...commonProps}
      />
    );
  };

  return (
    <div>
      {commonFields.length > 0 && (
        <Card className="panel-card form-section" title="Shared Fields" bordered={false}>
          <Form layout="vertical">
            {commonFields.map((field) => (
              <Form.Item key={field.key} label={renderFieldLabel(field)}>
                {renderInput(field, { editable: commonEditable })}
              </Form.Item>
            ))}
          </Form>
        </Card>
      )}
      {template.layout.sections.map((section) => {
        const visibleWhenField = section.visibleWhen?.field;
        const isSectionVisible = section.visibleWhen
          ? formData[visibleWhenField] === section.visibleWhen.equals
          : true;
        const visibleFields = (section.fields || [])
          .map((fieldKey) => {
            const field = fieldMap.get(fieldKey);
            if (commonFieldKeys.has(fieldKey)) {
              return null;
            }
            if (!field) {
              return null;
            }
            const access = getFieldAccess(field, accessContext);
            if (!access.visible) {
              return null;
            }
            const isControllerField = visibleWhenField && fieldKey === visibleWhenField;
            const editable = access.editable && (isSectionVisible || isControllerField);
            const required = access.required && isSectionVisible;
            return { field, access: { ...access, editable, required } };
          })
          .filter(Boolean);

        if (visibleFields.length === 0) {
          return null;
        }

        return (
          <Card
            key={section.id}
            className="panel-card form-section"
            title={section.name}
            bordered={false}
          >
            <Form layout="vertical">
              {visibleFields.map(({ field, access }) => {
                const error = errors[field.key];
                return (
                  <Form.Item
                    key={field.key}
                    label={renderFieldLabel(field)}
                    required={access.required}
                    validateStatus={showValidation && error ? 'error' : undefined}
                    help={showValidation && error ? error : null}
                  >
                    {renderInput(field, access)}
                  </Form.Item>
                );
              })}
            </Form>
          </Card>
        );
      })}
      <Modal
        visible={Boolean(historyFieldKey)}
        title={historyLabel ? `History - ${historyLabel}` : 'History'}
        onCancel={() => setHistoryFieldKey('')}
        onOk={() => setHistoryFieldKey('')}
        okText="Close"
      >
        {historyRows.length === 0 ? (
          <Typography.Text className="muted">No history available.</Typography.Text>
        ) : (
          <Table columns={historyColumns} data={historyRows} pagination={false} />
        )}
      </Modal>
    </div>
  );
}

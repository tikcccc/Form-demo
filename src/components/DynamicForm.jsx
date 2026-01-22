import React from 'react';
import { Card, Form, Input, InputNumber, Select, Switch } from '@arco-design/web-react';
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
  const defaultFormData = React.useMemo(() => buildDefaultFormData(template), [template]);
  const accessContext = { roleId, actionId, canEdit, requireEditable };

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
              <Form.Item key={field.key} label={field.label}>
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
                    label={field.label}
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
    </div>
  );
}

import React from 'react';
import { Card, Form, Input, InputNumber, Select, Switch } from '@arco-design/web-react';
import { getFieldAccess } from '../utils/workflow.js';

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
  if (!template) {
    return null;
  }

  const fieldMap = new Map(template.schema.map((field) => [field.key, field]));
  const commonFieldKeys = new Set(commonFields.map((field) => field.key));
  const accessContext = { roleId, actionId, canEdit, requireEditable };

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
        if (section.visibleWhen) {
          const expected = section.visibleWhen.equals;
          const current = formData[section.visibleWhen.field];
          if (current !== expected) {
            return null;
          }
        }

        const visibleFields = section.fields
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
            return { field, access };
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

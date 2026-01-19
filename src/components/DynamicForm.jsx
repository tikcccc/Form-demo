import React from 'react';
import { Card, Form, Input, InputNumber, Select, Switch } from '@arco-design/web-react';

export default function DynamicForm({ template, formData, editable, onChange }) {
  if (!template) {
    return null;
  }

  const fieldMap = new Map(template.schema.map((field) => [field.key, field]));

  const renderInput = (field) => {
    const value = formData[field.key];
    const commonProps = {
      disabled: !editable,
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
          disabled={!editable}
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
      {template.layout.sections.map((section) => {
        if (section.visibleWhen) {
          const expected = section.visibleWhen.equals;
          const current = formData[section.visibleWhen.field];
          if (current !== expected) {
            return null;
          }
        }

        return (
          <Card
            key={section.id}
            className="panel-card form-section"
            title={section.name}
            bordered={false}
          >
            <Form layout="vertical">
              {section.fields.map((fieldKey) => {
                const field = fieldMap.get(fieldKey);
                if (!field) {
                  return null;
                }
                return (
                  <Form.Item key={field.key} label={field.label} required={field.required}>
                    {renderInput(field)}
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

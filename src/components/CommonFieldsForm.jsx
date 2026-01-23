import React from 'react';
import {
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
  Typography,
} from '@arco-design/web-react';

export default function CommonFieldsForm({
  fields = [],
  values = {},
  onValueChange,
  errors = {},
  showValidation = false,
}) {
  if (!fields || fields.length === 0) {
    return <Typography.Text className="muted">No shared fields configured.</Typography.Text>;
  }

  const renderInput = (field) => {
    const value = values[field.key];
    if (field.type === 'textarea') {
      return (
        <Input.TextArea
          value={value}
          onChange={(val) => onValueChange(field.key, val)}
          autoSize
        />
      );
    }
    if (field.type === 'number') {
      return (
        <InputNumber value={value} onChange={(val) => onValueChange(field.key, val)} />
      );
    }
    if (field.type === 'select') {
      return (
        <Select
          value={value}
          onChange={(val) => onValueChange(field.key, val)}
          options={(field.options || []).map((option) => ({
            value: option,
            label: option,
          }))}
        />
      );
    }
    if (field.type === 'boolean') {
      return <Switch checked={Boolean(value)} onChange={(val) => onValueChange(field.key, val)} />;
    }
    return <Input value={value} onChange={(val) => onValueChange(field.key, val)} />;
  };

  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      {fields.map((field) => {
        const error = errors[field.key];
        const required = field.required !== false;
        return (
          <Form.Item
            key={field.key}
            label={field.label}
            required={required}
            validateStatus={showValidation && error ? 'error' : undefined}
            help={showValidation && error ? error : null}
          >
            {renderInput(field)}
          </Form.Item>
        );
      })}
    </Space>
  );
}

import React, { useState } from 'react';
import {
  Button,
  Drawer,
  Form,
  Input,
  InputNumber,
  Message,
  Select,
  Space,
  Switch,
  Table,
  Typography,
} from '@arco-design/web-react';
import { useAppContext } from '../../store/AppContext.jsx';

const fieldTypes = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Select' },
  { value: 'boolean', label: 'Boolean' },
];

export default function SchemaTab({ template }) {
  const { state, actions } = useAppContext();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [optionInput, setOptionInput] = useState('');
  const [formState, setFormState] = useState({
    key: '',
    label: '',
    type: 'text',
    required: false,
    listColumn: false,
    options: [],
    defaultValue: '',
    minLength: undefined,
    maxLength: undefined,
    min: undefined,
    max: undefined,
    visibleRoles: [],
    editableRoles: [],
    editableActionIds: [],
  });
  const roleOptions = state.roles.map((role) => ({
    value: role.id,
    label: role.label,
  }));
  const actionOptions = template.actions.map((action) => ({
    value: action.id,
    label: action.label,
  }));

  const openDrawer = (field) => {
    if (field) {
      setEditingField(field);
      setFormState({
        key: field.key,
        label: field.label,
        type: field.type,
        required: Boolean(field.required),
        listColumn: Boolean(field.listColumn),
        options: field.options || [],
        defaultValue: field.defaultValue ?? '',
        minLength: field.minLength,
        maxLength: field.maxLength,
        min: field.min,
        max: field.max,
        visibleRoles: field.visibleRoles || [],
        editableRoles: field.editableRoles || [],
        editableActionIds: field.editableActionIds || [],
      });
    } else {
      setEditingField(null);
      setFormState({
        key: '',
        label: '',
        type: 'text',
        required: false,
        listColumn: false,
        options: [],
        defaultValue: '',
        minLength: undefined,
        maxLength: undefined,
        min: undefined,
        max: undefined,
        visibleRoles: [],
        editableRoles: [],
        editableActionIds: [],
      });
    }
    setOptionInput('');
    setDrawerVisible(true);
  };

  const handleSave = () => {
    const key = formState.key.trim();
    if (!key) {
      Message.warning('Field key is required.');
      return;
    }
    if (!formState.label.trim()) {
      Message.warning('Field label is required.');
      return;
    }
    if (!editingField && template.schema.some((field) => field.key === key)) {
      Message.error('Field key already exists.');
      return;
    }
    const options = formState.options.map((item) => item.trim()).filter(Boolean);
    const nextField = {
      key,
      label: formState.label.trim(),
      type: formState.type,
      required: formState.required,
      listColumn: formState.listColumn,
    };
    if (formState.type === 'select') {
      nextField.options = options;
    }
    if (formState.type === 'text' || formState.type === 'textarea') {
      if (formState.minLength !== undefined) {
        nextField.minLength = formState.minLength;
      }
      if (formState.maxLength !== undefined) {
        nextField.maxLength = formState.maxLength;
      }
    }
    if (formState.type === 'number') {
      if (formState.min !== undefined) {
        nextField.min = formState.min;
      }
      if (formState.max !== undefined) {
        nextField.max = formState.max;
      }
    }
    if (formState.defaultValue) {
      nextField.defaultValue = formState.defaultValue;
    }
    if (formState.visibleRoles.length > 0) {
      nextField.visibleRoles = formState.visibleRoles;
    }
    if (formState.editableRoles.length > 0) {
      nextField.editableRoles = formState.editableRoles;
    }
    if (formState.editableActionIds.length > 0) {
      nextField.editableActionIds = formState.editableActionIds;
    }

    actions.updateTemplate(template.id, (current) => {
      const nextSchema = editingField
        ? current.schema.map((field) => (field.key === editingField.key ? nextField : field))
        : [...current.schema, nextField];
      return { ...current, schema: nextSchema };
    });
    setDrawerVisible(false);
  };

  const addOption = () => {
    const value = optionInput.trim();
    if (!value) {
      return;
    }
    if (formState.options.includes(value)) {
      Message.warning('Option already exists.');
      return;
    }
    setFormState({ ...formState, options: [...formState.options, value] });
    setOptionInput('');
  };

  const updateOption = (index, value) => {
    const nextOptions = [...formState.options];
    nextOptions[index] = value;
    setFormState({ ...formState, options: nextOptions });
  };

  const removeOption = (index) => {
    setFormState({
      ...formState,
      options: formState.options.filter((_, idx) => idx !== index),
    });
  };

  const columns = [
    { title: 'Key', dataIndex: 'key' },
    { title: 'Label', dataIndex: 'label' },
    { title: 'Type', dataIndex: 'type' },
    {
      title: 'Required',
      render: (_, record) => (record.required ? 'Yes' : 'No'),
    },
    {
      title: 'List Column',
      render: (_, record) => (record.listColumn ? 'Yes' : 'No'),
    },
    {
      title: 'Actions',
      render: (_, record) => (
        <Button size="mini" onClick={() => openDrawer(record)}>
          Edit
        </Button>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Button type="primary" onClick={() => openDrawer(null)}>
        Add Field
      </Button>
      <Table rowKey="key" columns={columns} data={template.schema} pagination={false} />
      <Drawer
        width={420}
        visible={drawerVisible}
        title={editingField ? 'Edit Field' : 'Add Field'}
        onOk={handleSave}
        onCancel={() => setDrawerVisible(false)}
        okText="Save"
      >
        <Form layout="vertical">
          <Form.Item label="Key" required>
            <Input
              value={formState.key}
              onChange={(value) => setFormState({ ...formState, key: value })}
              disabled={Boolean(editingField)}
            />
          </Form.Item>
          <Form.Item label="Label" required>
            <Input
              value={formState.label}
              onChange={(value) => setFormState({ ...formState, label: value })}
            />
          </Form.Item>
          <Form.Item label="Type">
            <Select
              options={fieldTypes}
              value={formState.type}
              onChange={(value) => setFormState({ ...formState, type: value })}
            />
          </Form.Item>
          {formState.type === 'select' && (
            <Form.Item label="Options">
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <Space style={{ width: '100%' }}>
                  <Input
                    placeholder="Add option"
                    value={optionInput}
                    onChange={(value) => setOptionInput(value)}
                    onPressEnter={addOption}
                  />
                  <Button type="primary" onClick={addOption}>
                    Add
                  </Button>
                </Space>
                {formState.options.length === 0 ? (
                  <Typography.Text className="muted">No options yet.</Typography.Text>
                ) : (
                  <Space direction="vertical" size={6} style={{ width: '100%' }}>
                    {formState.options.map((option, index) => (
                      <Space key={`${option}-${index}`} style={{ width: '100%' }}>
                        <Input
                          value={option}
                          onChange={(value) => updateOption(index, value)}
                        />
                        <Button size="mini" status="danger" onClick={() => removeOption(index)}>
                          Remove
                        </Button>
                      </Space>
                    ))}
                  </Space>
                )}
              </Space>
            </Form.Item>
          )}
          {(formState.type === 'text' || formState.type === 'textarea') && (
            <Form.Item label="Length Range">
              <Space>
                <InputNumber
                  min={0}
                  placeholder="Min"
                  value={formState.minLength}
                  onChange={(value) =>
                    setFormState({
                      ...formState,
                      minLength: value === null ? undefined : value,
                    })
                  }
                />
                <InputNumber
                  min={0}
                  placeholder="Max"
                  value={formState.maxLength}
                  onChange={(value) =>
                    setFormState({
                      ...formState,
                      maxLength: value === null ? undefined : value,
                    })
                  }
                />
              </Space>
            </Form.Item>
          )}
          {formState.type === 'number' && (
            <Form.Item label="Number Range">
              <Space>
                <InputNumber
                  placeholder="Min"
                  value={formState.min}
                  onChange={(value) =>
                    setFormState({
                      ...formState,
                      min: value === null ? undefined : value,
                    })
                  }
                />
                <InputNumber
                  placeholder="Max"
                  value={formState.max}
                  onChange={(value) =>
                    setFormState({
                      ...formState,
                      max: value === null ? undefined : value,
                    })
                  }
                />
              </Space>
            </Form.Item>
          )}
          <Form.Item label="Default Value">
            <Input
              value={formState.defaultValue}
              onChange={(value) => setFormState({ ...formState, defaultValue: value })}
            />
          </Form.Item>
          <Form.Item label="Visible Roles">
            <Select
              mode="multiple"
              options={roleOptions}
              value={formState.visibleRoles}
              onChange={(value) => setFormState({ ...formState, visibleRoles: value })}
              placeholder="All roles"
            />
          </Form.Item>
          <Form.Item label="Editable Roles">
            <Select
              mode="multiple"
              options={roleOptions}
              value={formState.editableRoles}
              onChange={(value) => setFormState({ ...formState, editableRoles: value })}
              placeholder="All roles"
            />
          </Form.Item>
          <Form.Item label="Editable Actions">
            <Select
              mode="multiple"
              options={actionOptions}
              value={formState.editableActionIds}
              onChange={(value) => setFormState({ ...formState, editableActionIds: value })}
              placeholder="Any action"
              disabled={actionOptions.length === 0}
            />
          </Form.Item>
          <Form.Item label="Required">
            <Switch
              checked={formState.required}
              onChange={(value) => setFormState({ ...formState, required: value })}
            />
          </Form.Item>
          <Form.Item label="List Column">
            <Switch
              checked={formState.listColumn}
              onChange={(value) => setFormState({ ...formState, listColumn: value })}
            />
          </Form.Item>
        </Form>
      </Drawer>
    </Space>
  );
}

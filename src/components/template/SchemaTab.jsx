import React, { useState } from 'react';
import {
  Button,
  Drawer,
  Form,
  Input,
  Message,
  Select,
  Space,
  Switch,
  Table,
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
  const { actions } = useAppContext();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [formState, setFormState] = useState({
    key: '',
    label: '',
    type: 'text',
    required: false,
    listColumn: false,
    options: '',
    defaultValue: '',
  });

  const openDrawer = (field) => {
    if (field) {
      setEditingField(field);
      setFormState({
        key: field.key,
        label: field.label,
        type: field.type,
        required: Boolean(field.required),
        listColumn: Boolean(field.listColumn),
        options: (field.options || []).join(', '),
        defaultValue: field.defaultValue ?? '',
      });
    } else {
      setEditingField(null);
      setFormState({
        key: '',
        label: '',
        type: 'text',
        required: false,
        listColumn: false,
        options: '',
        defaultValue: '',
      });
    }
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
    const options = formState.options
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
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
    if (formState.defaultValue) {
      nextField.defaultValue = formState.defaultValue;
    }

    actions.updateTemplate(template.id, (current) => {
      const nextSchema = editingField
        ? current.schema.map((field) => (field.key === editingField.key ? nextField : field))
        : [...current.schema, nextField];
      return { ...current, schema: nextSchema };
    });
    setDrawerVisible(false);
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
            <Form.Item label="Options (comma separated)">
              <Input
                value={formState.options}
                onChange={(value) => setFormState({ ...formState, options: value })}
              />
            </Form.Item>
          )}
          <Form.Item label="Default Value">
            <Input
              value={formState.defaultValue}
              onChange={(value) => setFormState({ ...formState, defaultValue: value })}
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

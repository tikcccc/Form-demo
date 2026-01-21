import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Grid,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Tag,
  Typography,
} from '@arco-design/web-react';
import { useAppContext } from '../../store/AppContext.jsx';
import { buildDefaultCommonData, buildDefaultFormData } from '../../utils/workflow.js';
import DynamicForm from '../DynamicForm.jsx';

const { Row, Col } = Grid;

export default function LayoutTab({ template }) {
  const { state, actions } = useAppContext();
  const [selectedSectionId, setSelectedSectionId] = useState(
    template.layout.sections[0]?.id || ''
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');

  useEffect(() => {
    if (!template.layout.sections.find((section) => section.id === selectedSectionId)) {
      setSelectedSectionId(template.layout.sections[0]?.id || '');
    }
  }, [template, selectedSectionId]);

  const selectedSection = template.layout.sections.find((section) => section.id === selectedSectionId);
  const commonFields = state.commonFields || [];
  const fieldOptions = template.schema.map((field) => ({
    value: field.key,
    label: field.label,
  }));
  const previewData = useMemo(
    () => ({
      ...buildDefaultFormData(template),
      ...buildDefaultCommonData(commonFields),
    }),
    [commonFields, template]
  );
  const booleanOptions = [
    { value: true, label: 'True' },
    { value: false, label: 'False' },
  ];

  const getFieldByKey = (fieldKey) =>
    template.schema.find((field) => field.key === fieldKey) || null;

  const getDefaultVisibleValue = (field) => {
    if (!field) {
      return '';
    }
    if (field.type === 'number') {
      return 0;
    }
    if (field.type === 'boolean') {
      return false;
    }
    if (field.type === 'select') {
      return field.options && field.options.length > 0 ? field.options[0] : '';
    }
    return '';
  };

  const normalizeVisibleWhenValue = (field, value) => {
    if (!field) {
      return value ?? '';
    }
    if (field.type === 'number') {
      if (value === '' || value === null || value === undefined) {
        return undefined;
      }
      const numeric = Number(value);
      return Number.isNaN(numeric) ? undefined : numeric;
    }
    if (field.type === 'boolean') {
      if (typeof value === 'boolean') {
        return value;
      }
      if (value === 'true') {
        return true;
      }
      if (value === 'false') {
        return false;
      }
      return undefined;
    }
    if (field.type === 'select') {
      if (!field.options || field.options.length === 0) {
        return undefined;
      }
      return field.options.includes(value) ? value : undefined;
    }
    return value ?? '';
  };

  const updateSection = (updates) => {
    if (!selectedSection) {
      return;
    }
    actions.updateTemplate(template.id, (current) => {
      const nextSections = current.layout.sections.map((section) =>
        section.id === selectedSection.id ? { ...section, ...updates } : section
      );
      return { ...current, layout: { ...current.layout, sections: nextSections } };
    });
  };

  const addSection = () => {
    const name = newSectionName.trim();
    if (!name) {
      return;
    }
    const newSection = {
      id: `${template.id}-section-${Date.now()}`,
      name,
      fields: [],
    };
    actions.updateTemplate(template.id, (current) => ({
      ...current,
      layout: {
        ...current.layout,
        sections: [...current.layout.sections, newSection],
      },
    }));
    setSelectedSectionId(newSection.id);
    setNewSectionName('');
    setModalVisible(false);
  };

  const addField = (fieldKey) => {
    if (!selectedSection || selectedSection.fields.includes(fieldKey)) {
      return;
    }
    updateSection({ fields: [...selectedSection.fields, fieldKey] });
  };

  const removeField = (fieldKey) => {
    if (!selectedSection) {
      return;
    }
    updateSection({ fields: selectedSection.fields.filter((item) => item !== fieldKey) });
  };

  const moveField = (index, direction) => {
    if (!selectedSection) {
      return;
    }
    const nextFields = [...selectedSection.fields];
    const target = index + direction;
    if (target < 0 || target >= nextFields.length) {
      return;
    }
    const temp = nextFields[index];
    nextFields[index] = nextFields[target];
    nextFields[target] = temp;
    updateSection({ fields: nextFields });
  };

  const visibleWhenField = selectedSection?.visibleWhen?.field
    ? getFieldByKey(selectedSection.visibleWhen.field)
    : null;
  const visibleWhenValue = normalizeVisibleWhenValue(
    visibleWhenField,
    selectedSection?.visibleWhen?.equals
  );

  const renderVisibleWhenInput = () => {
    if (!selectedSection?.visibleWhen?.field) {
      return <Input placeholder="Equals" disabled />;
    }
    if (!visibleWhenField) {
      return <Input placeholder="Equals" disabled />;
    }
    if (visibleWhenField.type === 'number') {
      return (
        <InputNumber
          placeholder="Equals"
          value={visibleWhenValue}
          onChange={(value) =>
            updateSection({
              visibleWhen: {
                field: selectedSection.visibleWhen.field,
                equals: value,
              },
            })
          }
        />
      );
    }
    if (visibleWhenField.type === 'boolean') {
      return (
        <Select
          placeholder="Equals"
          options={booleanOptions}
          value={visibleWhenValue}
          onChange={(value) =>
            updateSection({
              visibleWhen: {
                field: selectedSection.visibleWhen.field,
                equals: value,
              },
            })
          }
        />
      );
    }
    if (visibleWhenField.type === 'select' && visibleWhenField.options?.length) {
      return (
        <Select
          placeholder="Equals"
          options={visibleWhenField.options.map((option) => ({
            value: option,
            label: option,
          }))}
          value={visibleWhenValue}
          onChange={(value) =>
            updateSection({
              visibleWhen: {
                field: selectedSection.visibleWhen.field,
                equals: value,
              },
            })
          }
        />
      );
    }
    return (
      <Input
        placeholder="Equals"
        value={visibleWhenValue}
        onChange={(value) =>
          updateSection({
            visibleWhen: {
              field: selectedSection.visibleWhen.field,
              equals: value,
            },
          })
        }
      />
    );
  };

  return (
    <Row gutter={16} style={{ width: '100%' }}>
      <Col span={10}>
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Card
            className="panel-card"
            title="Sections"
            bordered={false}
            extra={
              <Button type="primary" size="small" onClick={() => setModalVisible(true)}>
                New Section
              </Button>
            }
          >
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <Typography.Text className="muted">
                Sections render as cards in the form. Order here controls the final layout.
              </Typography.Text>
              {template.layout.sections.length === 0 ? (
                <Typography.Text className="muted">No sections yet.</Typography.Text>
              ) : (
                template.layout.sections.map((section) => (
                  <Button
                    key={section.id}
                    type={section.id === selectedSectionId ? 'primary' : 'secondary'}
                    onClick={() => setSelectedSectionId(section.id)}
                    style={{ width: '100%', justifyContent: 'flex-start', textAlign: 'left' }}
                  >
                    <Typography.Text>{section.name}</Typography.Text>
                  </Button>
                ))
              )}
            </Space>
          </Card>
          {selectedSection && (
            <Card className="panel-card" title="Section Settings" bordered={false}>
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Typography.Text className="muted">
                  Section Title
                </Typography.Text>
                <Input
                  value={selectedSection.name}
                  onChange={(value) => updateSection({ name: value })}
                  placeholder="Section name"
                />
                <Space direction="vertical" size={6} style={{ width: '100%' }}>
                  <Typography.Text className="muted">Add fileds</Typography.Text>
                  <Select
                    placeholder="Add field to section"
                    onChange={addField}
                    options={fieldOptions}
                  />
                  {selectedSection.fields.length === 0 ? (
                    <Typography.Text className="muted">
                      No fields yet. Add from the dropdown above.
                    </Typography.Text>
                  ) : (
                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                      {selectedSection.fields.map((fieldKey, index) => {
                        const field = template.schema.find((item) => item.key === fieldKey);
                        return (
                          <Space key={fieldKey} style={{ width: '100%', justifyContent: 'space-between' }}>
                            <Tag>{field?.label || fieldKey}</Tag>
                            <Space>
                              <Button size="mini" onClick={() => moveField(index, -1)}>
                                Up
                              </Button>
                              <Button size="mini" onClick={() => moveField(index, 1)}>
                                Down
                              </Button>
                              <Button size="mini" status="danger" onClick={() => removeField(fieldKey)}>
                                Remove
                              </Button>
                            </Space>
                          </Space>
                        );
                      })}
                    </Space>
                  )}
                </Space>
                <Space direction="vertical" size={6} style={{ width: '100%' }}>
                  <Typography.Text className="muted">Visible When</Typography.Text>
                  <Typography.Text className="muted">
                    Show this section only when the selected field equals the value.
                  </Typography.Text>
                  <Space style={{ width: '100%' }}>
                    <Select
                      placeholder="Field"
                      value={selectedSection.visibleWhen?.field}
                      onChange={(value) => {
                        const field = getFieldByKey(value);
                        updateSection({
                          visibleWhen: {
                            field: value,
                            equals: getDefaultVisibleValue(field),
                          },
                        });
                      }}
                      options={fieldOptions}
                      style={{ width: 160 }}
                    />
                    {renderVisibleWhenInput()}
                    <Button onClick={() => updateSection({ visibleWhen: null })}>Clear</Button>
                  </Space>
                </Space>
              </Space>
            </Card>
          )}
        </Space>
      </Col>
      <Col span={14}>
        <Card className="panel-card" title="Preview" bordered={false}>
          <DynamicForm
            template={template}
            formData={previewData}
            roleId={state.currentRoleId}
            canEdit={false}
            commonFields={commonFields}
            commonEditable={false}
            onChange={() => {}}
          />
        </Card>
      </Col>
      <Modal
        visible={modalVisible}
        title="New Section"
        onOk={addSection}
        onCancel={() => setModalVisible(false)}
        okText="Create"
      >
        <Input
          placeholder="Section name"
          value={newSectionName}
          onChange={(value) => setNewSectionName(value)}
        />
      </Modal>
    </Row>
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Grid,
  Input,
  Modal,
  Select,
  Space,
  Tag,
  Typography,
} from '@arco-design/web-react';
import { useAppContext } from '../../store/AppContext.jsx';
import { buildDefaultFormData } from '../../utils/workflow.js';
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
  const fieldOptions = template.schema.map((field) => ({
    value: field.key,
    label: field.label,
  }));
  const previewData = useMemo(() => buildDefaultFormData(template), [template]);

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
                  Configure what appears in this section and when it should be visible.
                </Typography.Text>
                <Input
                  value={selectedSection.name}
                  onChange={(value) => updateSection({ name: value })}
                  placeholder="Section name"
                />
                <Space direction="vertical" size={6} style={{ width: '100%' }}>
                  <Typography.Text className="muted">Fields in this section</Typography.Text>
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
                      onChange={(value) =>
                        updateSection({
                          visibleWhen: {
                            field: value,
                            equals: selectedSection.visibleWhen?.equals || '',
                          },
                        })
                      }
                      options={fieldOptions}
                      style={{ width: 160 }}
                    />
                    <Input
                      placeholder="Equals"
                      value={selectedSection.visibleWhen?.equals || ''}
                      onChange={(value) =>
                        updateSection({
                          visibleWhen: {
                            field: selectedSection.visibleWhen?.field || '',
                            equals: value,
                          },
                        })
                      }
                    />
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

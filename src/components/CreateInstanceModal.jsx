import React, { useEffect, useMemo, useState } from 'react';
import { Button, Form, Input, Modal, Select, Typography } from '@arco-design/web-react';
import CommonFieldsForm from './CommonFieldsForm.jsx';
import { useAppContext } from '../store/AppContext.jsx';
import {
  buildDefaultCommonData,
  canInitiateTemplate,
  validateCommonFields,
} from '../utils/workflow.js';

export default function CreateInstanceModal({ visible, onClose, templates, onCreate }) {
  const { state } = useAppContext();
  const [templateId, setTemplateId] = useState('');
  const [title, setTitle] = useState('');
  const commonFields = state.commonFields || [];
  const hasCommonTitle = commonFields.some((field) => field.key === 'title');
  const [commonValues, setCommonValues] = useState(() => buildDefaultCommonData(commonFields));
  const [showValidation, setShowValidation] = useState(false);

  const allowedTemplates = useMemo(
    () =>
      templates.filter(
        (template) =>
          template.published && canInitiateTemplate(template, state.currentRoleId)
      ),
    [state.currentRoleId, templates]
  );

  const templateOptions = useMemo(
    () => allowedTemplates.map((template) => ({ value: template.id, label: template.name })),
    [allowedTemplates]
  );

  useEffect(() => {
    if (visible) {
      const defaultTemplate = allowedTemplates[0] || null;
      setTemplateId(defaultTemplate?.id || '');
      setTitle('');
      setShowValidation(false);
    }
  }, [allowedTemplates, visible]);

  useEffect(() => {
    if (visible) {
      setCommonValues(buildDefaultCommonData(commonFields));
    }
  }, [commonFields, visible]);

  const commonErrors = useMemo(
    () => validateCommonFields(commonFields, commonValues),
    [commonFields, commonValues]
  );

  const handleCommonValueChange = (key, value) => {
    setCommonValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleOk = () => {
    if (!templateId) {
      return;
    }
    if (!allowedTemplates.some((template) => template.id === templateId)) {
      return;
    }
    if (Object.keys(commonErrors).length > 0) {
      setShowValidation(true);
      return;
    }
    onCreate({
      templateId,
      title: title.trim(),
      commonFieldValues: commonValues,
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      title="Create Form"
      onOk={handleOk}
      onCancel={onClose}
      okText="Create"
    >
      <Form layout="vertical">
        <Form.Item label="Template">
          <Select options={templateOptions} value={templateId} onChange={setTemplateId} />
        </Form.Item>
        {templateOptions.length === 0 && (
          <Typography.Text className="muted">
            No published templates available for your role.
          </Typography.Text>
        )}
        {!hasCommonTitle && (
          <Form.Item label="Title">
            <Input placeholder="Optional" value={title} onChange={setTitle} />
          </Form.Item>
        )}
        <CommonFieldsForm
          fields={commonFields}
          values={commonValues}
          onValueChange={handleCommonValueChange}
          errors={commonErrors}
          showValidation={showValidation}
        />
      </Form>
    </Modal>
  );
}

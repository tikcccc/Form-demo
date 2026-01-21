import React, { useEffect, useMemo, useState } from 'react';
import { Button, Form, Input, Modal, Select } from '@arco-design/web-react';
import CommonFieldsForm from './CommonFieldsForm.jsx';
import { useAppContext } from '../store/AppContext.jsx';
import { buildDefaultCommonData } from '../utils/workflow.js';

export default function CreateInstanceModal({ visible, onClose, templates, onCreate }) {
  const { state } = useAppContext();
  const [templateId, setTemplateId] = useState('');
  const [title, setTitle] = useState('');
  const commonFields = state.commonFields || [];
  const hasCommonTitle = commonFields.some((field) => field.key === 'title');
  const [commonValues, setCommonValues] = useState(() => buildDefaultCommonData(commonFields));

  const templateOptions = useMemo(
    () =>
      templates
        .filter((template) => template.published)
        .map((template) => ({ value: template.id, label: template.name })),
    [templates]
  );

  useEffect(() => {
    if (visible) {
      const defaultTemplate = templates.find(
        (template) => template.published
      );
      setTemplateId(defaultTemplate?.id || '');
      setTitle('');
    }
  }, [visible, templates]);

  useEffect(() => {
    if (visible) {
      setCommonValues(buildDefaultCommonData(commonFields));
    }
  }, [commonFields, visible]);

  const handleCommonValueChange = (key, value) => {
    setCommonValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleOk = () => {
    if (!templateId) {
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
        {!hasCommonTitle && (
          <Form.Item label="Title">
            <Input placeholder="Optional" value={title} onChange={setTitle} />
          </Form.Item>
        )}
        <CommonFieldsForm
          fields={commonFields}
          values={commonValues}
          onValueChange={handleCommonValueChange}
        />
      </Form>
    </Modal>
  );
}

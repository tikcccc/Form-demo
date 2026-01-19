import React, { useEffect, useMemo, useState } from 'react';
import { Button, Form, Input, Modal, Select } from '@arco-design/web-react';

export default function CreateInstanceModal({ visible, onClose, types, templates, onCreate }) {
  const [typeId, setTypeId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [title, setTitle] = useState('');

  const typeOptions = useMemo(
    () => types.map((type) => ({ value: type.id, label: type.name })),
    [types]
  );

  const templateOptions = useMemo(
    () =>
      templates
        .filter((template) => template.typeId === typeId && template.published)
        .map((template) => ({ value: template.id, label: template.name })),
    [templates, typeId]
  );

  useEffect(() => {
    if (visible) {
      const defaultType = types[0]?.id || '';
      setTypeId(defaultType);
      const defaultTemplate = templates.find(
        (template) => template.typeId === defaultType && template.published
      );
      setTemplateId(defaultTemplate?.id || '');
      setTitle('');
    }
  }, [visible, templates, types]);

  useEffect(() => {
    if (typeId) {
      const defaultTemplate = templates.find(
        (template) => template.typeId === typeId && template.published
      );
      setTemplateId(defaultTemplate?.id || '');
    }
  }, [typeId, templates]);

  const handleOk = () => {
    if (!typeId || !templateId) {
      return;
    }
    onCreate({ typeId, templateId, title: title.trim() });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      title="Create Workflow"
      onOk={handleOk}
      onCancel={onClose}
      okText="Create"
    >
      <Form layout="vertical">
        <Form.Item label="Type">
          <Select options={typeOptions} value={typeId} onChange={setTypeId} />
        </Form.Item>
        <Form.Item label="Template">
          <Select options={templateOptions} value={templateId} onChange={setTemplateId} />
        </Form.Item>
        <Form.Item label="Title">
          <Input placeholder="Optional" value={title} onChange={setTitle} />
        </Form.Item>
      </Form>
      <Button type="text" onClick={() => setTitle(`New ${typeId.toUpperCase()}`)}>
        Use suggested title
      </Button>
    </Modal>
  );
}

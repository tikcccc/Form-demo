import React, { useEffect, useMemo, useState } from 'react';
import { Button, Form, Input, Modal, Select } from '@arco-design/web-react';

export default function CreateInstanceModal({ visible, onClose, templates, onCreate }) {
  const [templateId, setTemplateId] = useState('');
  const [title, setTitle] = useState('');

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

  const handleOk = () => {
    if (!templateId) {
      return;
    }
    onCreate({ templateId, title: title.trim() });
    onClose();
  };

  const selectedTemplate = templates.find((template) => template.id === templateId);

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
          <Select options={templateOptions} value={templateId} onChange={setTemplateId} />
        </Form.Item>
        <Form.Item label="Title">
          <Input placeholder="Optional" value={title} onChange={setTitle} />
        </Form.Item>
      </Form>
      <Button
        type="text"
        onClick={() => setTitle(`New ${selectedTemplate?.name || 'Workflow'}`)}
      >
        Use suggested title
      </Button>
    </Modal>
  );
}

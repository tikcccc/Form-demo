import React, { useEffect, useMemo, useState } from 'react';
import { Form, Input, Modal, Select } from '@arco-design/web-react';

export default function CreateTemplateModal({ visible, onClose, templates, onCreate }) {
  const [sourceTemplateId, setSourceTemplateId] = useState('');
  const [name, setName] = useState('');

  const templateOptions = useMemo(
    () => [
      { value: 'blank', label: 'Blank (no base)' },
      ...templates.map((template) => ({ value: template.id, label: template.name })),
    ],
    [templates]
  );

  useEffect(() => {
    if (visible) {
      setSourceTemplateId('blank');
      setName('');
    }
  }, [templates, visible]);

  const handleOk = () => {
    if (!name.trim()) {
      return;
    }
    const baseId = sourceTemplateId === 'blank' ? '' : sourceTemplateId;
    onCreate({ sourceTemplateId: baseId, name: name.trim() });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      title="Create Type"
      onOk={handleOk}
      onCancel={onClose}
      okText="Create"
    >
      <Form layout="vertical">
        <Form.Item label="Base Type (optional)">
          <Select
            value={sourceTemplateId}
            onChange={setSourceTemplateId}
            options={templateOptions}
          />
        </Form.Item>
        <Form.Item label="Type Name" required>
          <Input placeholder="e.g. Site Review" value={name} onChange={setName} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

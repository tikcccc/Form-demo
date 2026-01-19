import React, { useEffect, useMemo, useState } from 'react';
import { Form, Input, Modal, Select } from '@arco-design/web-react';

export default function CreateTemplateModal({ visible, onClose, types, templates, onCreate }) {
  const [typeId, setTypeId] = useState('');
  const [sourceTemplateId, setSourceTemplateId] = useState('');
  const [name, setName] = useState('');

  const typeOptions = useMemo(
    () => types.map((type) => ({ value: type.id, label: type.name })),
    [types]
  );

  const templateOptions = useMemo(() => {
    if (!typeId) {
      return [];
    }
    return templates
      .filter((template) => template.typeId === typeId)
      .map((template) => ({ value: template.id, label: template.name }));
  }, [templates, typeId]);

  useEffect(() => {
    if (visible) {
      const defaultType = types[0]?.id || '';
      setTypeId(defaultType);
      const defaultTemplate = templates.find((template) => template.typeId === defaultType);
      setSourceTemplateId(defaultTemplate?.id || '');
      setName('');
    }
  }, [types, templates, visible]);

  useEffect(() => {
    if (typeId) {
      const defaultTemplate = templates.find((template) => template.typeId === typeId);
      setSourceTemplateId(defaultTemplate?.id || '');
    }
  }, [typeId, templates]);

  const handleOk = () => {
    if (!typeId || !sourceTemplateId || !name.trim()) {
      return;
    }
    onCreate({ typeId, sourceTemplateId, name: name.trim() });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      title="Create Template"
      onOk={handleOk}
      onCancel={onClose}
      okText="Create"
    >
      <Form layout="vertical">
        <Form.Item label="Type" required>
          <Select value={typeId} onChange={setTypeId} options={typeOptions} />
        </Form.Item>
        <Form.Item label="Base Template" required>
          <Select
            value={sourceTemplateId}
            onChange={setSourceTemplateId}
            options={templateOptions}
          />
        </Form.Item>
        <Form.Item label="Template Name" required>
          <Input placeholder="e.g. Site Review" value={name} onChange={setName} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

import React, { useMemo, useState } from 'react';
import { Button, Card, Form, Input, Message, Modal, Select, Space, Table, Tag, Typography } from '@arco-design/web-react';

export default function AttachmentsPanel({
  attachments,
  onAdd,
  onStatusChange,
  statusRequired,
  statusOptions,
}) {
  const [visible, setVisible] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [form, setForm] = useState({ name: '', type: '', revision: '', remark: '' });

  const selectedAttachments = useMemo(
    () => attachments.filter((attachment) => selectedRowKeys.includes(attachment.id)),
    [attachments, selectedRowKeys]
  );

  const handleOk = () => {
    if (!form.name.trim()) {
      return;
    }
    onAdd({
      name: form.name.trim(),
      type: form.type.trim() || 'PDF',
      revision: form.revision.trim() || 'A',
      remark: form.remark.trim(),
    });
    setForm({ name: '', type: '', revision: '', remark: '' });
    setVisible(false);
  };

  const handleDownload = () => {
    if (selectedAttachments.length === 0) {
      Message.info('Select attachments to download.');
      return;
    }
    const content = selectedAttachments
      .map((attachment) => `${attachment.name} (${attachment.type}) Rev ${attachment.revision}`)
      .join('\\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'attachments.txt';
    anchor.click();
    URL.revokeObjectURL(url);
    Message.success(`Downloaded ${selectedAttachments.length} attachment(s).`);
  };

  const columns = [
    {
      title: 'File',
      dataIndex: 'name',
    },
    {
      title: 'Type',
      dataIndex: 'type',
    },
    {
      title: 'Rev',
      dataIndex: 'revision',
    },
    {
      title: 'Remark',
      dataIndex: 'remark',
    },
    {
      title: 'Status',
      render: (_, record) => {
        if (!statusRequired) {
          return record.status ? <Tag color="green">{record.status}</Tag> : '—';
        }
        return (
          <Select
            placeholder="Select"
            value={record.status || undefined}
            onChange={(value) => onStatusChange(record.id, value)}
            options={statusOptions.map((status) => ({ value: status, label: status }))}
          />
        );
      },
    },
  ];

  return (
    <Card
      className="panel-card"
      title={
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Typography.Text>Attachments</Typography.Text>
          <Space>
            <Button size="small" disabled={selectedRowKeys.length === 0} onClick={handleDownload}>
              Download Selected
            </Button>
            <Button size="small" onClick={() => setVisible(true)}>
              Add Attachment
            </Button>
          </Space>
        </Space>
      }
      bordered={false}
    >
      <Table
        columns={columns}
        data={attachments}
        rowKey="id"
        pagination={false}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
        }}
      />
      <Modal
        visible={visible}
        title="Add Attachment"
        onOk={handleOk}
        onCancel={() => setVisible(false)}
        okText="Add"
      >
        <Form layout="vertical">
          <Form.Item label="File name">
            <Input value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
          </Form.Item>
          <Form.Item label="Type">
            <Input value={form.type} onChange={(value) => setForm({ ...form, type: value })} />
          </Form.Item>
          <Form.Item label="Revision">
            <Input
              value={form.revision}
              onChange={(value) => setForm({ ...form, revision: value })}
            />
          </Form.Item>
          <Form.Item label="Remark">
            <Input
              value={form.remark}
              onChange={(value) => setForm({ ...form, remark: value })}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

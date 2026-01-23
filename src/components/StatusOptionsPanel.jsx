import React, { useMemo, useState } from 'react';
import {
  Button,
  Input,
  Message,
  Popconfirm,
  Space,
  Table,
  Typography,
} from '@arco-design/web-react';
import { useAppContext } from '../store/AppContext.jsx';

export default function StatusOptionsPanel() {
  const { state, actions } = useAppContext();
  const [inputValue, setInputValue] = useState('');
  const options = state.attachmentStatusOptions || [];

  const data = useMemo(
    () => options.map((status) => ({ key: status, status })),
    [options]
  );

  const handleAdd = () => {
    const nextValue = inputValue.trim();
    if (!nextValue) {
      Message.warning('Status name is required.');
      return;
    }
    const exists = options.some(
      (status) => status.toLowerCase() === nextValue.toLowerCase()
    );
    if (exists) {
      Message.warning('Status already exists.');
      return;
    }
    actions.updateAttachmentStatusOptions((current) => [...current, nextValue]);
    setInputValue('');
  };

  const handleDelete = (status) => {
    actions.updateAttachmentStatusOptions((current) =>
      current.filter((item) => item !== status)
    );
  };

  const columns = [
    { title: 'Status', dataIndex: 'status' },
    {
      title: 'Actions',
      render: (_, record) => (
        <Popconfirm
          title="Delete this status?"
          okText="Delete"
          cancelText="Cancel"
          onOk={() => handleDelete(record.status)}
        >
          <Button size="mini" status="danger">
            Remove
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <Typography.Text className="muted">
        These statuses are available for attachment status sets on actions.
      </Typography.Text>
      <Space>
        <Input
          placeholder="Add status"
          value={inputValue}
          onChange={setInputValue}
          onPressEnter={handleAdd}
        />
        <Button type="primary" onClick={handleAdd}>
          Add
        </Button>
      </Space>
      <Table rowKey="key" columns={columns} data={data} pagination={false} />
    </Space>
  );
}

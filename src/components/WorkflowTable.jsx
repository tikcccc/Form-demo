import React from 'react';
import { Badge, Space, Table, Tag, Typography } from '@arco-design/web-react';
import StatusTag from './StatusTag.jsx';
import {
  getCurrentTo,
  getDueDate,
  getLatestSentStep,
  getTypeById,
  isInbox,
  isOverdue,
  isUnread,
} from '../utils/workflow.js';

export default function WorkflowTable({ instances, types, roles, currentRoleId, onSelect }) {
  const columns = [
    {
      title: 'Transmittal No',
      dataIndex: 'transmittalNo',
      render: (_, record) => {
        const unread = isUnread(record, currentRoleId, roles);
        return (
          <Space>
            <Badge dot={unread} status="processing" />
            <Typography.Text>{record.transmittalNo}</Typography.Text>
          </Space>
        );
      },
    },
    {
      title: 'Type',
      dataIndex: 'typeId',
      render: (typeId) => getTypeById(types, typeId)?.name || typeId,
    },
    {
      title: 'Title',
      dataIndex: 'title',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (status) => <StatusTag status={status} />,
    },
    {
      title: 'Current To',
      render: (_, record) => getCurrentTo(record),
    },
    {
      title: 'Due Date',
      render: (_, record) => {
        const dueDate = getDueDate(record) || '—';
        const overdue = isOverdue(record);
        return (
          <Space>
            <Typography.Text>{dueDate}</Typography.Text>
            {overdue && <Tag color="red">Overdue</Tag>}
          </Space>
        );
      },
    },
    {
      title: 'Last Action',
      render: (_, record) => {
        const latest = getLatestSentStep(record);
        const label = latest ? latest.actionLabel : 'Not sent';
        const inbox = isInbox(record, currentRoleId, roles);
        return (
          <Space>
            <Typography.Text>{label}</Typography.Text>
            {inbox && <Tag color="blue">Inbox</Tag>}
          </Space>
        );
      },
    },
  ];

  return (
    <Table
      rowKey="id"
      columns={columns}
      data={instances}
      pagination={{ pageSize: 8 }}
      onRow={(record) => ({
        onClick: () => onSelect(record.id),
      })}
    />
  );
}

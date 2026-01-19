import React from 'react';
import { Button, Card, Descriptions, Space, Tag, Typography } from '@arco-design/web-react';
import StatusTag from './StatusTag.jsx';

export default function DetailHeader({
  instance,
  typeName,
  createdByLabel,
  currentTo,
  dueDate,
  hasSteps,
  onBack,
}) {
  return (
    <Card className="page-card">
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Button onClick={onBack}>Back</Button>
          {!hasSteps && <Tag color="gold">Editing (Not sent yet)</Tag>}
        </Space>
        <Typography.Title heading={5} style={{ margin: 0 }}>
          {instance.transmittalNo} · {typeName}
        </Typography.Title>
        <Descriptions column={3} layout="inline-vertical">
          <Descriptions.Item label="Status">
            <StatusTag status={instance.status} />
          </Descriptions.Item>
          <Descriptions.Item label="Created By">{createdByLabel}</Descriptions.Item>
          <Descriptions.Item label="Created At">{instance.createdAt}</Descriptions.Item>
          <Descriptions.Item label="Current To">{currentTo}</Descriptions.Item>
          <Descriptions.Item label="Due Date">{dueDate || '—'}</Descriptions.Item>
        </Descriptions>
      </Space>
    </Card>
  );
}

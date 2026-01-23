import React from 'react';
import { Button, Card, Descriptions, Space, Tag, Typography } from '@arco-design/web-react';
import StatusTag from './StatusTag.jsx';

export default function DetailHeader({
  instance,
  templateName,
  loopCount,
  createdByLabel,
  currentTo,
  dueDate,
  hasSteps,
  onBack,
  onExportPdf,
}) {
  const isClosed = instance.status === 'Closed';
  return (
    <Card className="page-card">
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Button onClick={onBack}>Back</Button>
          <Space>
            {onExportPdf && <Button onClick={onExportPdf}>Export PDF</Button>}
            {!isClosed && !hasSteps ? (
              <Tag color="gold">Editing (Not sent yet)</Tag>
            ) : null}
          </Space>
        </Space>
        <Typography.Title heading={5} style={{ margin: 0 }}>
          <Space size={8} wrap>
            <span>{instance.transmittalNo}</span>
            <Tag>{templateName}</Tag>
          </Space>
        </Typography.Title>
        {isClosed && (
          <Tag color="red">
            This form is closed and is now read-only.
          </Tag>
        )}
        <Descriptions column={3} layout="vertical">
          <Descriptions.Item label="Status">
            <StatusTag status={instance.status} />
          </Descriptions.Item>
          <Descriptions.Item label="Created By">{createdByLabel}</Descriptions.Item>
          <Descriptions.Item label="Created At">{instance.createdAt}</Descriptions.Item>
          <Descriptions.Item label="Current To">{currentTo}</Descriptions.Item>
          <Descriptions.Item label="Due Date">{dueDate || '—'}</Descriptions.Item>
          <Descriptions.Item label="Loop">{loopCount || 1}</Descriptions.Item>
        </Descriptions>
      </Space>
    </Card>
  );
}

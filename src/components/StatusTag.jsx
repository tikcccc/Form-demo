import React from 'react';
import { Tag } from '@arco-design/web-react';

const colorMap = {
  Draft: 'gold',
  Sent: 'green',
  Received: 'blue',
  Closed: 'gray',
};

export default function StatusTag({ status }) {
  const color = colorMap[status] || 'blue';
  return <Tag color={color}>{status}</Tag>;
}

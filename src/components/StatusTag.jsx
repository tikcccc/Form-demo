import React from 'react';
import { Tag } from '@arco-design/web-react';

const colorMap = {
  Open: 'green',
  Closed: 'gray',
};

export default function StatusTag({ status }) {
  const color = colorMap[status] || 'blue';
  return <Tag color={color}>{status}</Tag>;
}

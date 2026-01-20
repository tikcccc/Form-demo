import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  Tree,
} from '@arco-design/web-react';

export default function AttachmentsPanel({
  attachments,
  onAdd,
  onDelete,
  onStatusChange,
  statusRequired,
  statusOptions,
  fileLibrary = [],
  viewOptions = [],
  activeViewId = 'draft',
  onViewChange,
  canEdit = false,
}) {
  const [visible, setVisible] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [selectedFileKey, setSelectedFileKey] = useState('');
  const isDraftView = activeViewId === 'draft';
  const canEditDraft = canEdit && isDraftView;

  useEffect(() => {
    setSelectedRowKeys([]);
  }, [activeViewId, attachments]);

  const selectedAttachments = useMemo(
    () => attachments.filter((attachment) => selectedRowKeys.includes(attachment.id)),
    [attachments, selectedRowKeys]
  );

  const fileTreeData = useMemo(() => {
    const applySelectable = (nodes) =>
      nodes.map((node) => ({
        ...node,
        selectable: node.nodeType === 'file',
        children: node.children ? applySelectable(node.children) : undefined,
      }));
    return applySelectable(fileLibrary);
  }, [fileLibrary]);

  const expandedKeys = useMemo(() => {
    const keys = [];
    const walk = (nodes) => {
      nodes.forEach((node) => {
        if (node.children && node.children.length > 0) {
          keys.push(node.key);
          walk(node.children);
        }
      });
    };
    walk(fileTreeData);
    return keys;
  }, [fileTreeData]);

  const fileIndex = useMemo(() => {
    const map = new Map();
    const walk = (nodes, parents = []) => {
      nodes.forEach((node) => {
        const nextPath = [...parents, node.title];
        if (node.nodeType === 'file') {
          const fileName = node.file?.name || node.title;
          const fallbackType = fileName.includes('.')
            ? fileName.split('.').pop().toUpperCase()
            : 'FILE';
          map.set(node.key, {
            name: fileName,
            type: node.file?.type || fallbackType,
            revision: node.file?.revision || 'A',
            remark: node.file?.remark || '',
            path: nextPath.join(' / '),
          });
        }
        if (node.children) {
          walk(node.children, nextPath);
        }
      });
    };
    walk(fileLibrary);
    return map;
  }, [fileLibrary]);

  const selectedFile = selectedFileKey ? fileIndex.get(selectedFileKey) : null;

  const handleAddClick = () => {
    if (!canEdit) {
      return;
    }
    if (onViewChange && !isDraftView) {
      onViewChange('draft');
    }
    setSelectedFileKey('');
    setVisible(true);
  };

  const handleOk = () => {
    if (!selectedFile) {
      Message.info('Select a file to add.');
      return;
    }
    onAdd({
      name: selectedFile.name,
      type: selectedFile.type,
      revision: selectedFile.revision,
      remark: selectedFile.remark,
    });
    setSelectedFileKey('');
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
        if (!statusRequired || !canEditDraft) {
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
  if (canEditDraft && onDelete) {
    columns.push({
      title: 'Actions',
      render: (_, record) => (
        <Popconfirm
          title="Delete this attachment?"
          okText="Delete"
          cancelText="Cancel"
          onOk={() => onDelete(record.id)}
        >
          <Button size="mini" status="danger">
            Delete
          </Button>
        </Popconfirm>
      ),
    });
  }

  return (
    <Card
      className="panel-card"
      title={
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space size={12}>
            <Typography.Text>Attachments</Typography.Text>
            {viewOptions.length > 1 && onViewChange ? (
              <Space size={6}>
                <Typography.Text className="muted">Round</Typography.Text>
                <Select
                  size="mini"
                  value={activeViewId}
                  onChange={onViewChange}
                  options={viewOptions}
                />
              </Space>
            ) : null}
          </Space>
          <Space>
            <Button size="small" disabled={selectedRowKeys.length === 0} onClick={handleDownload}>
              Download Selected
            </Button>
            <Button size="small" disabled={!canEdit} onClick={handleAddClick}>
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
        onCancel={() => {
          setSelectedFileKey('');
          setVisible(false);
        }}
        okText="Add"
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Typography.Text className="muted">
            Select a file from the project library.
          </Typography.Text>
          <div
            style={{
              border: '1px solid var(--color-border-2)',
              borderRadius: 6,
              padding: 8,
              maxHeight: 280,
              overflow: 'auto',
            }}
          >
            {fileTreeData.length === 0 ? (
              <Typography.Text className="muted">No files available.</Typography.Text>
            ) : (
              <Tree
                treeData={fileTreeData}
                showLine
                blockNode
                defaultExpandedKeys={expandedKeys}
                selectedKeys={selectedFileKey ? [selectedFileKey] : []}
                onSelect={(keys) => {
                  const nextKey = Array.isArray(keys) ? keys[0] : keys;
                  setSelectedFileKey(nextKey || '');
                }}
              />
            )}
          </div>
          <div
            style={{
              border: '1px solid var(--color-border-2)',
              borderRadius: 6,
              padding: 10,
              background: 'var(--color-fill-2)',
            }}
          >
            <Typography.Text className="muted">Selected file</Typography.Text>
            {selectedFile ? (
              <Space direction="vertical" size={6} style={{ width: '100%', marginTop: 6 }}>
                <Typography.Text>{selectedFile.name}</Typography.Text>
                <Typography.Text className="muted" style={{ fontSize: 12 }}>
                  {selectedFile.path}
                </Typography.Text>
                <Space size={8}>
                  <Tag>{selectedFile.type}</Tag>
                  <Tag>Rev {selectedFile.revision}</Tag>
                </Space>
                {selectedFile.remark ? (
                  <Typography.Text className="muted">{selectedFile.remark}</Typography.Text>
                ) : null}
              </Space>
            ) : (
              <Typography.Text className="muted" style={{ display: 'block', marginTop: 6 }}>
                Choose a file to preview details.
              </Typography.Text>
            )}
          </div>
        </Space>
      </Modal>
    </Card>
  );
}

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
  title = 'Attachments',
  description = '',
  showAdd = true,
  showDownload = true,
  addLabel = 'Add Attachment',
  downloadLabel = 'Download Selected',
  attachments,
  onAdd,
  onDelete,
  onStatusChange,
  statusRequired = false,
  statusOptions = [],
  fileLibrary = [],
  viewOptions = [],
  activeViewId = 'draft',
  onViewChange,
  canEdit = false,
}) {
  const [visible, setVisible] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [selectedFileKeys, setSelectedFileKeys] = useState([]);
  const isDraftView = activeViewId === 'draft';
  const canEditDraft = canEdit && isDraftView;
  const canEditStatus = canEdit && statusRequired;

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
        disableCheckbox: node.nodeType !== 'file',
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
            key: node.key,
            name: fileName,
            type: node.file?.type || fallbackType,
            version: node.file?.version || 'A',
            size: node.file?.size || '',
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

  const selectedFiles = useMemo(
    () => selectedFileKeys.map((key) => fileIndex.get(key)).filter(Boolean),
    [fileIndex, selectedFileKeys]
  );

  const handleAddClick = () => {
    if (!canEdit) {
      return;
    }
    if (onViewChange && !isDraftView) {
      onViewChange('draft');
    }
    setSelectedFileKeys([]);
    setVisible(true);
  };

  const handleOk = () => {
    if (selectedFiles.length === 0) {
      Message.info('Select a file to add.');
      return;
    }
    selectedFiles.forEach((file) => {
      onAdd({
        name: file.name,
        type: file.type,
        version: file.version,
        size: file.size,
      });
    });
    setSelectedFileKeys([]);
    setVisible(false);
  };

  const handleDownload = () => {
    if (selectedAttachments.length === 0) {
      Message.info('Select attachments to download.');
      return;
    }
    const content = selectedAttachments
      .map((attachment) => {
        const version = attachment.version ? `Version ${attachment.version}` : 'Version -';
        const size = attachment.size ? `Size ${attachment.size}` : 'Size -';
        return `${attachment.name} (${attachment.type}) ${version}, ${size}`;
      })
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
      title: 'Size',
      render: (_, record) => record.size || '—',
    },
    {
      title: 'Version',
      render: (_, record) => record.version || '—',
    },
    {
      title: 'Status',
      render: (_, record) => {
        if (!statusRequired || !canEditStatus) {
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

  const actions = showDownload || showAdd
    ? (
      <Space>
        {showDownload ? (
          <Button size="small" disabled={selectedRowKeys.length === 0} onClick={handleDownload}>
            {downloadLabel}
          </Button>
        ) : null}
        {showAdd ? (
          <Button size="small" disabled={!canEdit} onClick={handleAddClick}>
            {addLabel}
          </Button>
        ) : null}
      </Space>
      )
    : null;

  return (
    <Card className="panel-card" bordered={false} title={title} extra={actions}>
      <Space direction="vertical" size={10} style={{ width: '100%' }}>
        {description ? <Typography.Text className="muted">{description}</Typography.Text> : null}
        {viewOptions.length > 1 && onViewChange ? (
          <Space size={6}>
            <Typography.Text className="muted">Step</Typography.Text>
            <Select
              size="mini"
              value={activeViewId}
              onChange={onViewChange}
              options={viewOptions}
            />
          </Space>
        ) : null}
        <Table
          columns={columns}
          data={attachments}
          rowKey="id"
          pagination={false}
          rowSelection={showDownload ? {
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
          } : undefined}
        />
      </Space>
      <Modal
        visible={visible}
        title="Add Attachment"
        onOk={handleOk}
        onCancel={() => {
          setSelectedFileKeys([]);
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
                checkable
                checkStrictly
                defaultExpandedKeys={expandedKeys}
                checkedKeys={selectedFileKeys}
                onCheck={(checked) => {
                  const nextKeys = Array.isArray(checked) ? checked : checked?.checked || [];
                  setSelectedFileKeys(nextKeys.filter((key) => fileIndex.has(key)));
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
            <Typography.Text className="muted">
              Selected files {selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''}
            </Typography.Text>
            {selectedFiles.length > 0 ? (
              <Space direction="vertical" size={6} style={{ width: '100%', marginTop: 6 }}>
                {selectedFiles.map((file) => (
                  <Space key={file.key || file.name} direction="vertical" size={4}>
                    <Typography.Text>{file.name}</Typography.Text>
                    <Typography.Text className="muted" style={{ fontSize: 12 }}>
                      {file.path}
                    </Typography.Text>
                    <Space size={8}>
                      <Tag>{file.type}</Tag>
                      {file.version ? <Tag>Version {file.version}</Tag> : null}
                      {file.size ? <Tag>{file.size}</Tag> : null}
                    </Space>
                  </Space>
                ))}
              </Space>
            ) : (
              <Typography.Text className="muted" style={{ display: 'block', marginTop: 6 }}>
                Choose files to preview details.
              </Typography.Text>
            )}
          </div>
        </Space>
      </Modal>
    </Card>
  );
}

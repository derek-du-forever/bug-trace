"use client";

import { useEffect, useState } from "react";
import { Table, Button, Form, Input, Select, Modal, message, Tag, Badge, Space, Avatar, Card, Divider, Popconfirm } from "antd";
import { MessageOutlined, EyeOutlined, UserOutlined, SendOutlined, EditOutlined, DeleteOutlined, SaveOutlined, CloseOutlined } from "@ant-design/icons";

const { confirm } = Modal;
const { TextArea } = Input;

const STATUS_OPTIONS = [
    "open",
    "assigned",
    "in_progress",
    "resolved",
    "rejected",
    "closed",
];

export default function DeveloperDashboard() {
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [assigningId, setAssigningId] = useState(null);
    const [devOptions, setDevOptions] = useState([]);
    const [commentCounts, setCommentCounts] = useState({});

    // Comment modal states
    const [detailOpen, setDetailOpen] = useState(false);
    const [selectedBug, setSelectedBug] = useState(null);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState("");
    const [quickComments, setQuickComments] = useState({});
    const [commentLoading, setCommentLoading] = useState(false);

    const [editingComment, setEditingComment] = useState(null);
    const [editContent, setEditContent] = useState("");

    const currentUser = {
        id: "current-user-id",
        role: "developer"
    };

    const getCommentCount = async (bugId) => {
        try {
            const res = await fetch(`/api/bugs/${bugId}/comments`);
            if (res.ok) {
                const data = await res.json();
                return data.total || data.data?.length || 0;
            }
        } catch (err) {
            console.warn('Failed to load comment count:', err);
        }
        return 0;
    };

    const load = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/bugs?page=1&pageSize=50&assigneeId=${currentUser.id}`);
            const data = await res.json();
            const bugs = data.items || [];
            setList(bugs);

            if (bugs.length > 0) {
                const commentCountPromises = bugs.map(async (bug) => {
                    const count = await getCommentCount(bug.id);
                    return { bugId: bug.id, count };
                });

                const results = await Promise.all(commentCountPromises);
                const newCommentCounts = {};
                results.forEach(({ bugId, count }) => {
                    newCommentCounts[bugId] = count;
                });

                setCommentCounts(newCommentCounts);
            }
        } catch (err) {
            message.error("Failed to load bugs");
        } finally {
            setLoading(false);
        }
    };

    const loadDevelopers = async () => {
        try {
            const res = await fetch(`/api/users?roles=developer`);
            const data = await res.json();
            setDevOptions(
                (data.data || []).map((d) => ({
                    value: d.id,
                    label: d.displayName || d.username,
                }))
            );
        } catch (err) {
            message.error("Failed to load developers");
        }
    };

    useEffect(() => {
        load();
        loadDevelopers();
    }, []);

    const assign = async (id, developerId) => {
        try {
            setAssigningId(id);
            const res = await fetch(`/api/bugs/${id}/assign`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ developerId }),
            });

            if (!res.ok) {
                const { error } = await res.json().catch(() => ({}));
                throw new Error(error || "Assign failed");
            }

            message.success("Assigned");
            await load();
        } catch (err) {
            message.error(err.message);
        } finally {
            setAssigningId(null);
        }
    };

    const updateStatus = async (id, newStatus) => {
        try {
            const res = await fetch(`/api/bugs/${id}/status`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });

            if (!res.ok) {
                const { error } = await res.json().catch(() => ({}));
                throw new Error(error || "Update status failed");
            }

            message.success("Status updated");
            await load();
        } catch (err) {
            message.error(err.message);
        }
    };

    const loadComments = async (bugId) => {
        try {
            setCommentLoading(true);
            const res = await fetch(`/api/bugs/${bugId}/comments`);
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || "Failed to load comments");
            }

            const data = await res.json();
            setComments(data.data || []);
        } catch (err) {
            message.error("Failed to load comments: " + err.message);
            setComments([]);
        } finally {
            setCommentLoading(false);
        }
    };

    const openDetail = async (bug) => {
        setSelectedBug(bug);
        setDetailOpen(true);
        await loadComments(bug.id);
    };

    const addQuickComment = async (bugId) => {
        const content = quickComments[bugId]?.trim();
        if (!content) {
            message.error("Please enter comment content");
            return;
        }

        try {
            const res = await fetch(`/api/bugs/${bugId}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content })
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || "Failed to add comment");
            }

            message.success("Comment added");
            setQuickComments({ ...quickComments, [bugId]: "" });

            const newCount = await getCommentCount(bugId);
            setCommentCounts(prev => ({ ...prev, [bugId]: newCount }));

        } catch (err) {
            message.error(err.message);
        }
    };

    const addComment = async () => {
        if (!newComment.trim()) {
            message.error("Please enter comment content");
            return;
        }

        try {
            const res = await fetch(`/api/bugs/${selectedBug.id}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: newComment.trim() })
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || "Failed to add comment");
            }

            message.success("Comment added");
            setNewComment("");
            await loadComments(selectedBug.id);

            const newCount = await getCommentCount(selectedBug.id);
            setCommentCounts(prev => ({ ...prev, [selectedBug.id]: newCount }));

        } catch (err) {
            message.error(err.message);
        }
    };

    const startEditComment = (comment) => {
        setEditingComment(comment.id);
        setEditContent(comment.content);
    };

    const saveEditComment = async (commentId) => {
        if (!editContent.trim()) {
            message.error("Comment content cannot be empty");
            return;
        }

        try {
            const res = await fetch(`/api/bugs/${selectedBug.id}/comments`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    commentId: commentId,
                    content: editContent.trim()
                })
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || "Failed to update comment");
            }

            message.success("Comment updated");
            setEditingComment(null);
            setEditContent("");
            await loadComments(selectedBug.id);
        } catch (err) {
            message.error(err.message);
        }
    };

    const cancelEditComment = () => {
        setEditingComment(null);
        setEditContent("");
    };

    const getRoleColor = (role) => {
        switch (role) {
            case 'admin': return 'red';
            case 'developer': return 'blue';
            case 'tester': return 'green';
            default: return 'default';
        }
    };

    const getUserDisplayName = (comment) => {
        if (comment.user) {
            return comment.user.displayName || comment.user.username || 'Unknown User';
        }
        return comment.userId ? comment.userId.slice(-8) : 'Unknown';
    };

    const canEditComment = (comment) => {
        return comment.userId === currentUser.id;
    };

    const columns = [
        { title: "Title", dataIndex: "title", width: 200, ellipsis: true },
        {
            title: "Status",
            dataIndex: "status",
            width: 150,
            render: (value, record) => (
                <Select
                    style={{ width: '100%' }}
                    value={value}
                    onChange={(v) => updateStatus(record.id, v)}
                    options={STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
                />
            ),
        },
        { title: "Priority", dataIndex: "priority", width: 100 },
        { title: "Severity", dataIndex: "severity", width: 100 },
        {
            title: "Assign",
            width: 200,
            render: (_, r) => (
                <Select
                    style={{ width: '100%' }}
                    value={r?.assignee?.id || undefined}
                    options={devOptions}
                    disabled={true}        // ⭐ 完全禁止编辑
                    showArrow={false}      // ⭐ 不显示下拉箭头（更像只读）
                    bordered={false}       // ⭐ 更像 Label（可选）
                />
            ),
        },
        {
            title: "Comment",
            width: 120,
            render: (_, record) => (
                <Button
                    type="link"
                    danger
                    icon={<EyeOutlined />}
                    onClick={() => openDetail(record)}
                >
                    view
                </Button>
            ),
        },
    ];

    return (
        <div style={{ padding: 24 }}>
            <Table
                rowKey="id"
                loading={loading}
                columns={columns}
                dataSource={list}
                scroll={{ x: 1200 }}
                pagination={{
                    pageSize: 20,
                    showSizeChanger: true,
                    showQuickJumper: true,
                }}
            />


            <Modal
                open={detailOpen}
                onCancel={() => {
                    setDetailOpen(false);
                    setSelectedBug(null);
                    setComments([]);
                    setNewComment("");
                    setEditingComment(null);
                    setEditContent("");
                }}
                title={
                    selectedBug ? (
                        <div>
                            <MessageOutlined style={{ marginRight: 8 }} />
                            Bug Details & Comments
                            <div style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
                                {selectedBug.title}
                            </div>
                        </div>
                    ) : "Bug Details"
                }
                footer={null}
                width={900}
                style={{ top: 20 }}
            >
                {selectedBug && (
                    <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                        <Card size="small" style={{ marginBottom: 16, backgroundColor: '#fafafa' }}>
                            <div><strong>Description:</strong> {selectedBug.description}</div>
                            <div style={{ marginTop: 8 }}>
                                <Tag color="blue">Status: {selectedBug.status}</Tag>
                                <Tag color="orange">Priority: {selectedBug.priority}</Tag>
                                <Tag color="red">Severity: {selectedBug.severity}</Tag>
                                {selectedBug.assignee && (
                                    <Tag color="green">
                                        Assigned to: {selectedBug.assignee.displayName || selectedBug.assignee.username}
                                    </Tag>
                                )}
                            </div>
                        </Card>

                        <Divider>Comments ({comments.length})</Divider>

                        <Card size="small" style={{ marginBottom: 16 }}>
                            <TextArea
                                placeholder="Write a comment..."
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                autoSize={{ minRows: 3, maxRows: 6 }}
                                style={{ marginBottom: 12 }}
                            />
                            <div style={{ textAlign: 'right' }}>
                                <Button
                                    type="primary"
                                    onClick={addComment}
                                    disabled={!newComment.trim()}
                                    icon={<SendOutlined />}
                                >
                                    Add Comment
                                </Button>
                            </div>
                        </Card>

                        {commentLoading ? (
                            <div style={{ textAlign: 'center', padding: 20 }}>Loading comments...</div>
                        ) : comments.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 20, color: '#999' }}>
                                No comments yet. Be the first to comment!
                            </div>
                        ) : (
                            comments.map(comment => (
                                <Card key={comment.id} size="small" style={{ marginBottom: 12 }}>
                                    <div style={{ display: 'flex', gap: 12 }}>
                                        <Avatar size="small" icon={<UserOutlined />} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                                <span style={{ fontWeight: 'bold' }}>
                                                    {getUserDisplayName(comment)}
                                                </span>
                                                {comment.user?.role && (
                                                    <Tag color={getRoleColor(comment.user.role)} size="small">
                                                        {comment.user.role}
                                                    </Tag>
                                                )}
                                                <span style={{ color: '#999', fontSize: '12px' }}>
                                                    {new Date(comment.createdAt).toLocaleString()}
                                                </span>
                                            </div>

                                            {editingComment === comment.id ? (
                                                <div style={{ marginBottom: 8 }}>
                                                    <TextArea
                                                        value={editContent}
                                                        onChange={(e) => setEditContent(e.target.value)}
                                                        autoSize={{ minRows: 2, maxRows: 6 }}
                                                        style={{ marginBottom: 8 }}
                                                    />
                                                    <Space>
                                                        <Button
                                                            type="primary"
                                                            size="small"
                                                            onClick={() => saveEditComment(comment.id)}
                                                            icon={<SaveOutlined />}
                                                        >
                                                            Save
                                                        </Button>
                                                        <Button
                                                            size="small"
                                                            onClick={cancelEditComment}
                                                            icon={<CloseOutlined />}
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </Space>
                                                </div>
                                            ) : (
                                                <div style={{ marginBottom: 8, lineHeight: '1.6' }}>
                                                    {comment.content}
                                                </div>
                                            )}

                                            {editingComment !== comment.id && canEditComment(comment) && (
                                                <Space size="small">
                                                    <Button
                                                        type="text"
                                                        size="small"
                                                        onClick={() => startEditComment(comment)}
                                                        icon={<EditOutlined />}
                                                        style={{ padding: 0, height: 'auto' }}
                                                    >
                                                        Edit
                                                    </Button>
                                                </Space>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            ))
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
}
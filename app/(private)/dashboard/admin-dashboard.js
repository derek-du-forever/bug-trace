"use client";

import {useEffect, useState} from "react";
import {
    Table,
    Button,
    Input,
    Select,
    Modal,
    message,
    Tag,
    Space,
    Avatar,
    Card,
    Divider,
    Popconfirm
} from "antd";
import {
    MessageOutlined,
    EyeOutlined,
    UserOutlined,
    SendOutlined,
    EditOutlined,
    DeleteOutlined,
    SaveOutlined,
    CloseOutlined
} from "@ant-design/icons";

const {confirm} = Modal;
const {TextArea} = Input;

const STATUS_OPTIONS = [
    "open",
    "assigned",
    "in_progress",
    "resolved",
    "rejected",
    "closed",
];

export default function AdminDashboard() {
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [descTimers, setDescTimers] = useState({});
    const [assigningId, setAssigningId] = useState(null);
    const [devOptions, setDevOptions] = useState([]);

    // History modal state
    const [historyOpen, setHistoryOpen] = useState(false);
    const [historyList, setHistoryList] = useState([]);

    // Comment modal states
    const [detailOpen, setDetailOpen] = useState(false);
    const [selectedBug, setSelectedBug] = useState(null);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState("");
    const [commentLoading, setCommentLoading] = useState(false);

    const [editingComment, setEditingComment] = useState(null);
    const [editContent, setEditContent] = useState("");

    const currentUser = {
        id: "current-user-id",
        role: "admin"
    };

    const load = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/bugs?page=1&pageSize=50`);
            const data = await res.json();
            setList(data.items || []);
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
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({developerId}),
            });

            if (!res.ok) {
                const {error} = await res.json().catch(() => ({}));
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
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({status: newStatus}),
            });

            if (!res.ok) {
                const {error} = await res.json().catch(() => ({}));
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

    const addComment = async () => {
        if (!newComment.trim()) {
            message.error("Please enter comment content");
            return;
        }

        try {
            const res = await fetch(`/api/bugs/${selectedBug.id}/comments`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({content: newComment.trim()})
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || "Failed to add comment");
            }

            message.success("Comment added");
            setNewComment("");
            await loadComments(selectedBug.id);
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
                headers: {"Content-Type": "application/json"},
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

    const deleteComment = async (commentId) => {
        try {
            const res = await fetch(`/api/bugs/${selectedBug.id}/comments`, {
                method: "DELETE",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({commentId: commentId})
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || "Failed to delete comment");
            }

            message.success("Comment deleted");
            await loadComments(selectedBug.id);
        } catch (err) {
            message.error(err.message);
        }
    };

    const showDeleteConfirm = (id) => {
        confirm({
            title: "Are you sure delete this bug?",
            content: "This action cannot be undone.",
            okText: "Yes",
            okType: "danger",
            cancelText: "No",
            onOk: async () => {
                await handleDelete(id);
            }
        });
    };

    async function handleDelete(id) {
        try {
            const res = await fetch(`/api/bugs/${id}`, {
                method: "DELETE",
                credentials: "include",
            });

            const data = await res.json();

            if (!res.ok) {
                message.error("Delete failed: " + (data.error || "Unknown error"));
                return;
            }

            message.success("Bug deleted successfully");
            await load();
        } catch (err) {
            message.error("Delete error: " + err.message);
        }
    }

    const getRoleColor = (role) => {
        switch (role) {
            case 'admin':
                return 'red';
            case 'developer':
                return 'blue';
            case 'tester':
                return 'green';
            default:
                return 'default';
        }
    };

    const getUserDisplayName = (comment) => {
        if (comment.user) {
            return comment.user.displayName || comment.user.username || 'Unknown User';
        }
        return comment.userId ? comment.userId.slice(-8) : 'Unknown';
    };

    const canEditComment = (comment) => {
        return comment.userId === currentUser.id || currentUser.role === 'admin';
    };

    const columns = [
        {title: "Title", dataIndex: "title", width: 200, ellipsis: true},
        {
            title: "Status",
            dataIndex: "status",
            width: 150,
            render: (value, record) => (
                <Select
                    style={{width: '100%'}}
                    value={value}
                    onChange={(v) => updateStatus(record.id, v)}
                    options={STATUS_OPTIONS.map((s) => ({value: s, label: s}))}
                />
            ),
        },
        {title: "Priority", dataIndex: "priority", width: 100},
        {title: "Severity", dataIndex: "severity", width: 100},
        {
            title: "Assign",
            width: 100,
            render: (_, r) => (
                <Select
                    style={{width: '100%'}}
                    value={r?.assignee?.id || undefined}
                    loading={assigningId === r.id}
                    disabled={assigningId === r.id}
                    onChange={(v) => assign(r.id, v)}
                    options={devOptions}
                />
            ),
        },
        {
            title: "Comments",
            width: 120,
            render: (_, record) => (
                <Button
                    type="link"
                    danger
                    icon={<EyeOutlined/>}
                    onClick={() => openDetail(record)}
                >
                    view
                </Button>
            ),
        },
        {
            title: "Delete",
            width: 100,
            render: (_, record) => (
                <Button
                    danger
                    onClick={() => showDeleteConfirm(record.id)}
                >
                    Delete
                </Button>
            ),
        },
    ];

    return (
        <div style={{padding: 24}}>
            <Table
                rowKey="id"
                loading={loading}
                columns={columns}
                dataSource={list}
                scroll={{x: 1400}}
                pagination={{
                    pageSize: 20,
                    showSizeChanger: true,
                    showQuickJumper: true,
                }}
            />

            <Modal
                open={historyOpen}
                onCancel={() => setHistoryOpen(false)}
                title="History"
                footer={null}
                width={600}
            >
                {historyList.map((h) => (
                    <div
                        key={h.id}
                        style={{
                            padding: "10px 0",
                            borderBottom: "1px solid #eee",
                        }}
                    >
                        <div><b>Action:</b> {h.action}</div>
                        <div><b>Old:</b> {h.oldValue ?? "-"}</div>
                        <div><b>New:</b> {h.newValue ?? "-"}</div>
                        <div>
                            <b>User:</b>{" "}
                            {h?.user?.displayName || h?.user?.username || h.userId}
                        </div>
                        <div>
                            <b>Time:</b>{" "}
                            {new Date(h.createdAt).toLocaleString()}
                        </div>
                    </div>
                ))}
            </Modal>

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
                            <MessageOutlined style={{marginRight: 8}}/>
                            <div style={{fontSize: 14, color: '#666', marginTop: 4}}>
                                {selectedBug.title}
                            </div>
                        </div>
                    ) : "Bug Details"
                }
                footer={null}
                width={900}
                style={{top: 20}}
            >
                {selectedBug && (
                    <div style={{maxHeight: '70vh', overflowY: 'auto'}}>
                        <Card size="small" style={{marginBottom: 16, backgroundColor: '#fafafa'}}>
                            <div><strong>Description:</strong> {selectedBug.description}</div>
                            <div style={{marginTop: 8}}>
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

                        <Card size="small" style={{marginBottom: 16}}>
                            <TextArea
                                placeholder="Write a comment..."
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                autoSize={{minRows: 3, maxRows: 6}}
                                style={{marginBottom: 12}}
                            />
                            <div style={{textAlign: 'right'}}>
                                <Button
                                    type="primary"
                                    onClick={addComment}
                                    disabled={!newComment.trim()}
                                    icon={<SendOutlined/>}
                                >
                                    Add Comment
                                </Button>
                            </div>
                        </Card>

                        {commentLoading ? (
                            <div style={{textAlign: 'center', padding: 20}}>Loading comments...</div>
                        ) : comments.length === 0 ? (
                            <div style={{textAlign: 'center', padding: 20, color: '#999'}}>
                                No comments yet. Be the first to comment!
                            </div>
                        ) : (
                            comments.map(comment => (
                                <Card key={comment.id} size="small" style={{marginBottom: 12}}>
                                    <div style={{display: 'flex', gap: 12}}>
                                        <Avatar size="small" icon={<UserOutlined/>}/>
                                        <div style={{flex: 1}}>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 8,
                                                marginBottom: 8
                                            }}>
                                                <span style={{fontWeight: 'bold'}}>
                                                    {getUserDisplayName(comment)}
                                                </span>
                                                {comment.user?.role && (
                                                    <Tag color={getRoleColor(comment.user.role)} size="small">
                                                        {comment.user.role}
                                                    </Tag>
                                                )}
                                                <span style={{color: '#999', fontSize: '12px'}}>
                                                    {new Date(comment.createdAt).toLocaleString()}
                                                </span>
                                            </div>

                                            {editingComment === comment.id ? (
                                                <div style={{marginBottom: 8}}>
                                                    <TextArea
                                                        value={editContent}
                                                        onChange={(e) => setEditContent(e.target.value)}
                                                        autoSize={{minRows: 2, maxRows: 6}}
                                                        style={{marginBottom: 8}}
                                                    />
                                                    <Space>
                                                        <Button
                                                            type="primary"
                                                            size="small"
                                                            onClick={() => saveEditComment(comment.id)}
                                                            icon={<SaveOutlined/>}
                                                        >
                                                            Save
                                                        </Button>
                                                        <Button
                                                            size="small"
                                                            onClick={cancelEditComment}
                                                            icon={<CloseOutlined/>}
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </Space>
                                                </div>
                                            ) : (
                                                <div style={{marginBottom: 8, lineHeight: '1.6'}}>
                                                    {comment.content}
                                                </div>
                                            )}

                                            {editingComment !== comment.id && canEditComment(comment) && (
                                                <Space size="small">
                                                    <Button
                                                        type="text"
                                                        size="small"
                                                        onClick={() => startEditComment(comment)}
                                                        icon={<EditOutlined/>}
                                                        style={{padding: 0, height: 'auto'}}
                                                    >
                                                        Edit
                                                    </Button>

                                                    <Popconfirm
                                                        title="Delete comment"
                                                        description="Are you sure you want to delete this comment?"
                                                        onConfirm={() => deleteComment(comment.id)}
                                                        okText="Yes"
                                                        cancelText="No"
                                                    >
                                                        <Button
                                                            type="text"
                                                            size="small"
                                                            danger
                                                            icon={<DeleteOutlined/>}
                                                            style={{padding: 0, height: 'auto'}}
                                                        >
                                                            Delete
                                                        </Button>
                                                    </Popconfirm>
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
"use client";

import { useEffect, useState } from "react";
import { Table, Button, Form, Input, Select, Modal, message } from "antd";

const PRIORITY = ["low", "medium", "high", "critical"];
const SEVERITY = ["minor", "major", "critical"];
const STATUS_OPTIONS = [
    "open",
    "assigned",
    "in_progress",
    "resolved",
    "rejected",
    "closed",
];

export default function TesterDashboard() {
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [descTimers, setDescTimers] = useState({});
    const [assigningId, setAssigningId] = useState(null);
    const [devOptions, setDevOptions] = useState([]);

    // 🟦 Create Bug modal
    const [openCreate, setOpenCreate] = useState(false);
    const [createSubmitting, setCreateSubmitting] = useState(false);
    const [createForm] = Form.useForm();

    // 🟦 History modal
    const [historyOpen, setHistoryOpen] = useState(false);
    const [historyList, setHistoryList] = useState([]);

    // =============================================================
    // Load Bugs
    // =============================================================
    const load = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/bugs?page=1&pageSize=50`);
            const data = await res.json();
            setList(data.items || []);
        } catch {
            message.error("Failed to load bugs");
        } finally {
            setLoading(false);
        }
    };

    // Load Developers
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
        } catch {
            message.error("Failed to load developers");
        }
    };

    useEffect(() => {
        load();
        loadDevelopers();
    }, []);

    // =============================================================
    // Assign Developer
    // =============================================================
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

    // =============================================================
    // Update Status
    // =============================================================
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

    // =============================================================
    // Update Description (debounced)
    // =============================================================
    const debouncedUpdateDescription = (id, value) => {
        if (descTimers[id]) clearTimeout(descTimers[id]);

        const timer = setTimeout(async () => {
            try {
                const res = await fetch(`/api/bugs/${id}/comments`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ content: value }),
                });

                if (!res.ok) {
                    const { error } = await res.json().catch(() => ({}));
                    throw new Error(error || "Update failed");
                }

                message.success("Description updated");
                await load();
            } catch (err) {
                message.error(err.message);
            }
        }, 500);

        setDescTimers((prev) => ({ ...prev, [id]: timer }));
    };

    // =============================================================
    // Load History
    // =============================================================
    const openHistory = async (bugId) => {
        try {
            const res = await fetch(`/api/bugs/${bugId}/history`);
            const data = await res.json();
            setHistoryList(data || []);
            setHistoryOpen(true);
        } catch {
            message.error("Failed to load history");
        }
    };

    // =============================================================
    // Create Bug
    // =============================================================
    const createBug = async () => {
        try {
            const values = await createForm.validateFields();
            setCreateSubmitting(true);

            const res = await fetch(`/api/bugs`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });

            if (!res.ok) {
                const { error } = await res.json().catch(() => ({}));
                throw new Error(error || "Create failed");
            }

            message.success("Bug created");
            setOpenCreate(false);
            createForm.resetFields();
            await load();
        } catch (err) {
            message.error(err.message);
        } finally {
            setCreateSubmitting(false);
        }
    };

    // =============================================================
    // Table Columns
    // =============================================================
    const columns = [
        { title: "Title", dataIndex: "title" },
        {
            title: "Status",
            dataIndex: "status",
            render: (value, record) => (
                <Select
                    style={{ width: 150 }}
                    value={value}
                    onChange={(v) => updateStatus(record.id, v)}
                    options={STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
                />
            ),
        },
        { title: "Priority", dataIndex: "priority" },
        { title: "Severity", dataIndex: "severity" },
        { title: "Assignee", render: (_, r) => r?.assignee?.displayName || "-" },
        {
            title: "Assign",
            render: (_, r) => (
                <Select
                    style={{ width: 240 }}
                    value={r?.assignee?.id}
                    placeholder="Pick developer"
                    loading={assigningId === r.id}
                    disabled={assigningId === r.id}
                    onChange={(v) => assign(r.id, v)}
                    options={devOptions}
                />
            ),
        },
        {
            title: "Description",
            dataIndex: "description",
            render: (value, record) => (
                <Input
                    defaultValue={value}
                    onChange={(e) =>
                        debouncedUpdateDescription(record.id, e.target.value)
                    }
                    style={{ width: 250 }}
                />
            ),
        },
        {
            title: "History",
            render: (_, r) => (
                <Button onClick={() => openHistory(r.id)}>View</Button>
            ),
        },
    ];

    // =============================================================
    // UI Render
    // =============================================================
    return (
        <div style={{ padding: 24 }}>
            {/* Create Button */}
            <div style={{ marginBottom: 12 }}>
                <Button type="primary" onClick={() => setOpenCreate(true)}>
                    New Bug
                </Button>
            </div>

            <Table rowKey="id" loading={loading} columns={columns} dataSource={list} />

            {/* =======================================================
                Create Bug Modal
            ======================================================= */}
            <Modal
                open={openCreate}
                onCancel={() => setOpenCreate(false)}
                onOk={createBug}
                confirmLoading={createSubmitting}
                title="Create New Bug"
                okText="Create"
                width={450}
            >
                <Form layout="vertical" form={createForm}>
                    <Form.Item
                        name="title"
                        label="Title"
                        rules={[{ required: true, message: "Title required" }]}
                    >
                        <Input placeholder="Bug title" />
                    </Form.Item>

                    <Form.Item
                        name="priority"
                        label="Priority"
                        rules={[{ required: true }]}
                    >
                        <Select options={PRIORITY.map((p) => ({ value: p, label: p }))} />
                    </Form.Item>

                    <Form.Item
                        name="severity"
                        label="Severity"
                        rules={[{ required: true }]}
                    >
                        <Select options={SEVERITY.map((s) => ({ value: s, label: s }))} />
                    </Form.Item>

                    <Form.Item name="description" label="Description">
                        <Input.TextArea rows={3} placeholder="Description" />
                    </Form.Item>
                </Form>
            </Modal>

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
                        <div><b>User:</b> {h?.user?.displayName || h?.user?.username || h.userId}</div>
                        <div><b>Time:</b> {new Date(h.createdAt).toLocaleString()}</div>
                    </div>
                ))}
            </Modal>
        </div>
    );
}

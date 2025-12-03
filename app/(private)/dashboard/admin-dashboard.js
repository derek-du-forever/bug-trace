"use client";

import { useEffect, useState } from "react";
import { Table, Button, Form, Input, Select, Modal, message, Tag } from "antd";

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

export default function AdminDashboard() {
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [descTimers, setDescTimers] = useState({});
    const [assigningId, setAssigningId] = useState(null);
    const [devOptions, setDevOptions] = useState([]);

    // 🟦 History modal state
    const [historyOpen, setHistoryOpen] = useState(false);
    const [historyList, setHistoryList] = useState([]);

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

    const openHistory = async (bugId) => {
        try {
            const res = await fetch(`/api/bugs/${bugId}/history`);
            const data = await res.json();
            setHistoryList(data || []);
            setHistoryOpen(true);
        } catch (err) {
            message.error("Failed to load history");
        }
    };

    /** 表格列定义（100%保持与 Tester 一致） */
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
                    placeholder="Pick developer"
                    value={r?.assignee?.id || undefined}
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
                <Button onClick={() => openHistory(r.id)}>
                    View
                </Button>
            ),
        },
    ];

    return (
        <div style={{ padding: 24 }}>
            {/* Admin 不显示 New Bug（Tester 独有功能） */}

            <Table
                rowKey="id"
                loading={loading}
                columns={columns}
                dataSource={list}
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
                        <div>
                            <b>Action:</b> {h.action}
                        </div>
                        <div>
                            <b>Old:</b> {h.oldValue ?? "-"}
                        </div>
                        <div>
                            <b>New:</b> {h.newValue ?? "-"}
                        </div>
                        <div>
                            <b>User:</b>{" "}
                            {h?.user?.displayName ||
                                h?.user?.username ||
                                h.userId}
                        </div>
                        <div>
                            <b>Time:</b>{" "}
                            {new Date(h.createdAt).toLocaleString()}
                        </div>
                    </div>
                ))}
            </Modal>
        </div>
    );
}

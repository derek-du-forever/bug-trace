"use client";
import { useEffect, useState } from "react";
import { Table, Select, message, Tag } from "antd";

const NEXTS = ["in_progress", "resolved", "rejected", "closed"];
const STATUS_COLOR = {
  open: "default",
  in_progress: "processing",
  resolved: "success",
  rejected: "error",
  closed: "gold",
};

export default function DeveloperDashboard() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/bugs?page=1&pageSize=50`);
      if (!res.ok) throw new Error("Failed to load bugs");
      const data = await res.json().catch(() => ({ data: [] }));
      setList(data.items  || []);
    } catch (err) {
      message.error(err.message || "Load failed");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const updateStatus = async (id, status) => {
    try {
      setUpdatingId(id);
      const res = await fetch(`/api/bugs/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({}));
        throw new Error(error || "Update failed");
      }
      message.success("Updated");
      await load();
    } catch (err) {
      message.error(err.message || "Update failed");
    } finally {
      setUpdatingId(null);
    }
  };

  const columns = [
    { title: "Title", dataIndex: "title" },
    {
      title: "Status",
      dataIndex: "status",
      render: v => <Tag color={STATUS_COLOR[v] || "default"}>{v}</Tag>,
    },
    { title: "Priority", dataIndex: "priority" },
    { title: "Severity", dataIndex: "severity" },
    { title: "Reporter", render: (_, r) => r?.creator?.displayName || "-" },
    {
      title: "Action",
      render: (_, r) => (
          <Select
              style={{ width: 180 }}
              placeholder="Set status"
              value={r?.status}
              loading={updatingId === r.id}
              disabled={updatingId === r.id || loading}
              onChange={(v) => updateStatus(r.id, v)}
              options={NEXTS.map(v => ({ value: v, label: v }))}
          />
      ),
    },
  ];

  return (
      <div style={{ padding: 24 }}>
        <Table rowKey="id" loading={loading} columns={columns} dataSource={list} />
      </div>
  );
}

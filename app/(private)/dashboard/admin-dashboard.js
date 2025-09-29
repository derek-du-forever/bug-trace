"use client";
import { useEffect, useMemo, useState } from "react";
import { Table, Select, message, Tag } from "antd";

const STATUS_COLOR = {
  open: "default",
  in_progress: "processing",
  resolved: "success",
  rejected: "error",
  closed: "gold",
};

export default function AdminDashboard() {
  const [list, setList] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [assigningId, setAssigningId] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const [bugsRes, devsRes] = await Promise.all([
        fetch(`/api/bugs?page=1&pageSize=100`),
        fetch(`/api/users?roles=developer&page=1&pageSize=100`),
      ]);

      if (!bugsRes.ok) throw new Error("Failed to load bugs");
      if (!devsRes.ok) throw new Error("Failed to load developers");

      const bugs = await bugsRes.json().catch(() => ({ data: [] }));
      const devs = await devsRes.json().catch(() => ({ data: [] }));

      setList(bugs.items  || []);
      setUsers(devs.items  || []);
    } catch (err) {
      message.error(err.message || "Load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const devOptions = useMemo(
      () => (users || []).map(u => ({
        value: u.id,
        label: `${u.displayName || u.username || u.id} (${u.username || "user"})`,
      })),
      [users]
  );

  const assign = async (id, developerId) => {
    try {
      setAssigningId(id);
      const res = await fetch(`/api/bugs/${id}/assign`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ developerId: developerId || null }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || "Assign failed");
      }
      message.success("Assigned");
      await load();
    } catch (err) {
      message.error(err.message || "Assign failed");
    } finally {
      setAssigningId(null);
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
    { title: "Assignee", render: (_, r) => r?.assignee?.displayName || "-" },
    {
      title: "Assign",
      render: (_, r) => (
          <Select
              style={{ width: 260 }}
              placeholder="Pick developer"
              allowClear
              value={r?.assignee?.id || undefined}
              loading={assigningId === r.id}
              disabled={assigningId === r.id || loading}
              onChange={(v) => assign(r.id, v)}
              options={devOptions}
          />
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
        />
      </div>
  );
}

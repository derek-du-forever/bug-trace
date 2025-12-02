"use client";
import { useEffect, useMemo, useState } from "react";
import { Table, Select, message, Tag } from "antd";

const STATUS_COLOR = {
  open: "default",
  assigned: "blue",
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

  // 加载 Bugs 和 Developers
  const load = async () => {
    try {
      setLoading(true);
      const [bugsRes, devsRes] = await Promise.all([
        fetch(`/api/bugs?page=1&pageSize=100`),
        fetch(`/api/users?page=1&pageSize=100`),  // ✅ 不带 roles 参数
      ]);

      if (!bugsRes.ok || !devsRes.ok) throw new Error("Failed to load data");

      const bugsData = await bugsRes.json();
      const devsData = await devsRes.json();

      setList(bugsData.items || []);
      setUsers((devsData.data  || []).filter(u => u.roles === "developer"));  // ✅ 只要 developer
    } catch (err) {
      message.error(err.message || "Load failed");
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => { load(); }, []);

  // 开发者选项
  const devOptions = useMemo(
      () => (users || []).map(u => ({
        value: u.id,
        label: `${u.displayName || u.username} (${u.username})`,
      })),
      [users]
  );

  // 分配 Bug
  const assign = async (id, developerId) => {
    console.log("Assign bug", id, "to developerId", developerId);
    try {
      setAssigningId(id);
      const res = await fetch(`/api/bugs/${id}/assign`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ developerId }),
      });

      if (!res.ok) {
        const { error } = await res.json().catch(() => ({}));
        throw new Error(error || "Failed to assign");
      }

      message.success("Assigned");
      await load();
    } catch (err) {
      message.error(err.message || "Assign failed");
    } finally {
      setAssigningId(null);
    }
  };

  // 表格列
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
              style={{ width: 240 }}
              placeholder="Pick developer"
              value={r?.assignee?.id || undefined}   // ✅ 显示当前 assignee
              loading={assigningId === r.id}
              disabled={assigningId === r.id}
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

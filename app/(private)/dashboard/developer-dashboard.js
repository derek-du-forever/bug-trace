"use client";
import { useEffect, useState } from "react";
import { Table, Select, message, Tag } from "antd";
import { useAuth } from "@/app/contexts/AuthContext";  // 引入用户上下文

// 可选的状态列表
const NEXTS = ["in_progress", "resolved", "rejected", "closed"];

const STATUS_COLOR = {
  open: "default",
  in_progress: "processing",
  resolved: "success",
  rejected: "error",
  closed: "gold",
};

export default function DeveloperDashboard() {
  const { user } = useAuth(); // 当前登录用户
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  // 加载当前开发者的 bug
  const load = async () => {
    if (!user) return;
    try {
      setLoading(true);
      // 关键点：带上 assignee 参数
      const res = await fetch(
        `/api/bugs?page=1&pageSize=50&assignee=${encodeURIComponent(
          user.username
        )}`
      );
      if (!res.ok) throw new Error("Failed to load bugs");
      const data = await res.json().catch(() => ({ data: [] }));
      setList(data.items || []);
    } catch (err) {
      message.error(err.message || "Load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) load();
  }, [user]);

  // 更新状态
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
      render: (v) => <Tag color={STATUS_COLOR[v] || "default"}>{v}</Tag>,
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
          options={NEXTS.map((v) => ({ value: v, label: v }))}
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
        pagination={false} // 简化：一次性显示
      />
    </div>
  );
}

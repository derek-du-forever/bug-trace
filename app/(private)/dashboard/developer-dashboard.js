"use client";
import { useEffect, useState } from "react";
import { Table, Select, message } from "antd";

const NEXTS = ["in_progress", "resolved", "rejected", "closed"];

export default function DeveloperDashboard() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await fetch(`/api/bugs?page=1&pageSize=50`);
    const data = await res.json();
    setList(data.items || []);
    setLoading(false);
  };
  useEffect(()=>{ load(); }, []);

  const updateStatus = async (id, status) => {
    const res = await fetch(`/api/bugs/${id}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      message.success("Updated");
      load();
    } else {
      const { error } = await res.json();
      message.error(error || "Failed");
    }
  };

  const columns = [
    { title: "Title", dataIndex: "title" },
    { title: "Status", dataIndex: "status" },
    { title: "Priority", dataIndex: "priority" },
    { title: "Severity", dataIndex: "severity" },
    { title: "Reporter", render: (_,_r)=> _r.creator?.displayName || "-" },
    { title: "Action", render: (_,_r)=> (
      <Select style={{width:160}} placeholder="Set status"
        onChange={(v)=>updateStatus(_r.id, v)}
        options={NEXTS.map(v=>({value:v,label:v}))}
      />
    )},
  ];

  return <div style={{ padding: 24 }}>
    <Table rowKey="id" loading={loading} columns={columns} dataSource={list} />
  </div>;
}

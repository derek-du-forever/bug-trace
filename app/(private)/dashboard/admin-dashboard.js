"use client";
import { useEffect, useMemo, useState } from "react";
import { Table, Select, message, Tag } from "antd";

export default function AdminDashboard() {
  const [list, setList] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const [bugsRes, devsRes] = await Promise.all([
      fetch(`/api/bugs?page=1&pageSize=100`),
      fetch(`/api/users?roles=developer&page=1&pageSize=100`),
    ]);
    const bugs = await bugsRes.json();
    const devs = await devsRes.json();
    setList(bugs.items || []);
    setUsers(devs.items || []);
    setLoading(false);
  };
  useEffect(()=>{ load(); }, []);

  const devOptions = useMemo(
    ()=>users.map(u=>({value:u.id, label:`${u.displayName} (${u.username})`})),
    [users]
  );

  const assign = async (id, developerId) => {
    const res = await fetch(`/api/bugs/${id}/assign`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ developerId }),
    });
    if (res.ok) {
      message.success("Assigned");
      load();
    } else {
      const { error } = await res.json();
      message.error(error || "Failed");
    }
  };

  const columns = [
    { title: "Title", dataIndex: "title" },
    { title: "Status", dataIndex: "status", render: v => <Tag color="blue">{v}</Tag> },
    { title: "Priority", dataIndex: "priority" },
    { title: "Severity", dataIndex: "severity" },
    { title: "Reporter", render: (_,_r)=> _r.creator?.displayName || "-" },
    { title: "Assignee", render: (_,_r)=> _r.assignee?.displayName || "-" },
    { title: "Assign", render: (_,_r)=> (
      <Select
        style={{ width: 240 }}
        placeholder="Pick developer"
        value={_r.assignee?.id}
        onChange={(v)=>assign(_r.id, v)}
        options={devOptions}
      />
    )},
  ];

  return <div style={{ padding: 24 }}>
    <Table rowKey="id" loading={loading} columns={columns} dataSource={list} />
  </div>;
}

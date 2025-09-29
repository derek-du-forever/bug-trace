"use client";
import { useEffect, useState } from "react";
import { Table, Button, Form, Input, Select, Modal, message } from "antd";

const PRIORITY = ["low", "medium", "high", "critical"];
const SEVERITY = ["minor", "major", "critical"];

export default function TesterDashboard() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    const res = await fetch(`/api/bugs?page=1&pageSize=50`);
    const data = await res.json();
    setList(data.items || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const submit = async () => {
    const v = await form.validateFields();
    const res = await fetch(`/api/bugs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(v),
    });
    if (res.ok) {
      message.success("Submitted");
      setOpen(false);
      form.resetFields();
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
    { title: "Assignee", render: (_,_r)=> _r.assignee?.displayName || "-" },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 12 }}>
        <Button type="primary" onClick={() => setOpen(true)}>New Bug</Button>
      </div>
      <Table rowKey="id" loading={loading} columns={columns} dataSource={list} />
      <Modal title="Submit Bug" open={open} onOk={submit} onCancel={()=>setOpen(false)}>
        <Form form={form} layout="vertical" initialValues={{ priority: "medium", severity: "minor" }}>
          <Form.Item name="title" label="Title" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description" rules={[{ required: true }]}>
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="priority" label="Priority" rules={[{ required: true }]}>
            <Select options={PRIORITY.map(v=>({value:v,label:v}))} />
          </Form.Item>
          <Form.Item name="severity" label="Severity" rules={[{ required: true }]}>
            <Select options={SEVERITY.map(v=>({value:v,label:v}))} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

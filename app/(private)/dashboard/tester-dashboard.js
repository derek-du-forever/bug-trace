"use client";
import { useEffect, useState } from "react";
import { Table, Button, Form, Input, Select, Modal, message, Tag } from "antd";

const PRIORITY = ["low", "medium", "high", "critical"];
const SEVERITY = ["minor", "major", "critical"];
const STATUS_COLOR = {
  open: "default",
  in_progress: "processing",
  resolved: "success",
  rejected: "error",
  closed: "gold",
};

export default function TesterDashboard() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);

  // 新建 Bug 弹窗
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  // 指派状态
  const [assigningId, setAssigningId] = useState(null);
  const [devOptions, setDevOptions] = useState([]);

  // 加载 bug 列表
  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/bugs?page=1&pageSize=50`);
      if (!res.ok) throw new Error("Failed to load bugs");
      const data = await res.json().catch(() => ({ data: [] }));
      setList(data.items || []);
    } catch (err) {
      message.error(err.message || "Load failed");
    } finally {
      setLoading(false);
    }
  };

  // 加载开发者选项
  const loadDevelopers = async () => {
    try {
      const res = await fetch(`/api/users?roles=developer`);
      if (!res.ok) throw new Error("Failed to load developers");
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

  // 提交 Bug
  const submit = async () => {
    try {
      const v = await form.validateFields();
      setSubmitting(true);
      const res = await fetch(`/api/bugs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(v),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({}));
        throw new Error(error || "Submit failed");
      }
      message.success("Submitted");
      setOpen(false);
      form.resetFields();
      await load();
    } catch (err) {
      message.error(err.message || "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  // 执行指派
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
      render: (v) => <Tag color={STATUS_COLOR[v] || "default"}>{v}</Tag>,
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
          value={r?.assignee?.id || undefined} // ✅ 显示当前 assignee
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
      <div style={{ marginBottom: 12 }}>
        <Button type="primary" onClick={() => setOpen(true)}>
          New Bug
        </Button>
      </div>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={list}
      />

      {/* 新建 Bug Modal */}
      <Modal
        title="Submit Bug"
        open={open}
        okText="Submit"
        onOk={submit}
        okButtonProps={{ loading: submitting }}
        onCancel={() => setOpen(false)}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ priority: "medium", severity: "minor" }}
        >
          <Form.Item
            name="title"
            label="Title"
            rules={[
              { required: true, message: "Please input title" },
              { max: 120, message: "Up to 120 characters" },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="description"
            label="Description"
            rules={[
              { required: true, message: "Please input description" },
              { max: 2000, message: "Up to 2000 characters" },
            ]}
          >
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item
            name="priority"
            label="Priority"
            rules={[{ required: true, message: "Please select priority" }]}
          >
            <Select options={PRIORITY.map((v) => ({ value: v, label: v }))} />
          </Form.Item>
          <Form.Item
            name="severity"
            label="Severity"
            rules={[{ required: true, message: "Please select severity" }]}
          >
            <Select options={SEVERITY.map((v) => ({ value: v, label: v }))} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Table, Button, Form, Input, Radio } from "antd";

const columns = [
    {
        title: "Username",
        dataIndex: "username",
        key: "username",
    },
    {
        title: "Display Name",
        dataIndex: "displayName",
        key: "displayName",
    },
    {
        title: "Roles",
        dataIndex: "roles",
        key: "roles",
    },
];

const App = () => {
    const [form] = Form.useForm();
    const [data, setData] = useState([]);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0,
    });
    const [loading, setLoading] = useState(false);

    // ✅ fetchData 是纯函数，不依赖 pagination state
    const fetchData = useCallback(
        async ({ current, pageSize }) => {
            setLoading(true);

            const values = form.getFieldsValue();
            const query = new URLSearchParams({
                page: current,
                pageSize,
                username: values.username || "",
                displayName: values.displayName || "",
                roles: values.roles || "",
            }).toString();

            const res = await fetch(`/api/users?${query}`);
            const json = await res.json();

            setData(json.data);
            setPagination({
                current,
                pageSize,
                total: json.pagination.total,
            });
            setLoading(false);
        },
        [form] // 只依赖 form
    );

    useEffect(() => {
        fetchData({
            current: 1,
            pageSize: 10,
        });
    }, [fetchData]);

    // 分页变化
    const handleTableChange = (pager) => {
        fetchData({ current: pager.current, pageSize: pager.pageSize });
    };

    // 表单提交搜索
    const onFinish = () => {
        fetchData({ current: 1, pageSize: pagination.pageSize }); // 搜索重置到第一页
    };

    return (
        <>
            <Form
                form={form}
                layout="inline"
                initialValues={{ roles: "" }}
                onFinish={onFinish}
            >
                <Form.Item label="Username" name="username">
                    <Input />
                </Form.Item>
                <Form.Item label="Display Name" name="displayName">
                    <Input />
                </Form.Item>
                <Form.Item label="Roles" name="roles">
                    <Radio.Group>
                        <Radio value="">All</Radio>
                        <Radio value="user">User</Radio>
                        <Radio value="admin">Admin</Radio>
                    </Radio.Group>
                </Form.Item>
                <Form.Item>
                    <Button type="primary" htmlType="submit">
                        Submit
                    </Button>
                </Form.Item>
            </Form>

            <Table
                className="pt-4"
                columns={columns}
                dataSource={data}
                loading={loading}
                pagination={{
                    current: pagination.current,
                    pageSize: pagination.pageSize,
                    total: pagination.total,
                    showSizeChanger: true,
                }}
                onChange={handleTableChange}
                rowKey="id"
            />
        </>
    );
};

export default App;

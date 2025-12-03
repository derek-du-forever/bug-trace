"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Table, Button, Form, Input, Radio, Popconfirm } from "antd";
import CreateOrEditUserModal from "./create-or-edit-user.modal";

const columns = (onEdit, onDelete) => [
    { title: "Username", dataIndex: "username", key: "username" },
    { title: "Display Name", dataIndex: "displayName", key: "displayName" },
    { title: "Roles", dataIndex: "roles", key: "roles" },
    {
        title: "Action",
        key: "action",
        render: (_, record) => (
            <>
                <Button type="link" onClick={() => onEdit(record)}>
                    Edit
                </Button>
                <Popconfirm
                    title="Delete the user"
                    description="Are you sure to delete this user?"
                    onConfirm={() => onDelete(record)}
                    okText="Yes"
                    cancelText="No"
                >
                    <Button danger type="link">
                        Delete
                    </Button>
                </Popconfirm>
            </>
        ),
    },
];

const UserTable = () => {

    //--------------------------------------------
    // ⭐ 新增：获取当前登录用户角色
    //--------------------------------------------
    const [currentRole, setCurrentRole] = useState(null);

    useEffect(() => {
        async function loadMe() {
            try {
                const res = await fetch("/api/me");
                if (!res.ok) return;
                const user = await res.json();
                setCurrentRole(user.roles);
            } catch (err) {
                console.error("Failed to load current user:", err);
            }
        }
        loadMe();
    }, []);
    //--------------------------------------------

    const [form] = Form.useForm();
    const [data, setData] = useState([]);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0,
    });
    const [loading, setLoading] = useState(false);

    const [modalVisible, setModalVisible] = useState(false);
    const [editUser, setEditUser] = useState(null);

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
            setPagination({ current, pageSize, total: json.pagination.total });
            setLoading(false);
        },
        [form]
    );

    useEffect(() => {
        fetchData({ current: 1, pageSize: 10 });
    }, [fetchData]);

    const handleTableChange = (pager) => {
        fetchData({ current: pager.current, pageSize: pager.pageSize });
    };

    const onFinish = () => {
        fetchData({ current: 1, pageSize: pagination.pageSize });
    };

    const handleEdit = (user) => {
        setEditUser(user);
        setModalVisible(true);
    };

    const handleDelete = (user) => {
        fetch(`/api/users/${user.id}`, { method: "DELETE" }).then(() => {
            fetchData({ current: 1, pageSize: pagination.pageSize });
        });
    };

    const handleModalOk = async (values) => {
        if (editUser) {
            await fetch(`/api/users/${editUser.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });
        } else {
            await fetch(`/api/users`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });
        }
        setModalVisible(false);
        setEditUser(null);
        fetchData({ current: 1, pageSize: pagination.pageSize });
    };

    return (
        <>
            <Button
                type="primary"
                className="mb-4"
                onClick={() => handleEdit(null)}
            >
                Add User
            </Button>

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
                    <Radio.Group
                        onChange={() => {
                            form.submit();
                        }}
                    >
                        <Radio value="">All</Radio>
                        <Radio value="developer">Developer</Radio>
                        <Radio value="tester">Tester</Radio>

                        {currentRole === "admin" && (
                            <Radio value="admin">Admin</Radio>
                        )}
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
                columns={columns(handleEdit, handleDelete)}
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

            <CreateOrEditUserModal
                visible={modalVisible}
                onCancel={() => setModalVisible(false)}
                onOk={handleModalOk}
                user={editUser}
            />
        </>
    );
};

export default UserTable;

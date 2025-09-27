'use client';

import React, {useState} from 'react';
import {Input, message, Form, Modal} from 'antd';
import {useAuth} from '@/app/contexts/AuthContext';

export default function ChangePassword({open, setOpen}) {
    const {user} = useAuth(); // 当前用户
    const [loading, setLoading] = useState(false);
    const [messageApi, contextHolder] = message.useMessage();

    // 关键：使用 useForm 获取实例
    const [form] = Form.useForm();

    const handleOk = async () => {
        try {
            const values = await form.validateFields();

            if (!user) {
                messageApi.open({
                    type: 'error',
                    content: 'User not logged in',
                });
                return;
            }

            setLoading(true);
            const res = await fetch('/api/change-password', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    userId: user.id,
                    oldPassword: values.oldPassword,
                    newPassword: values.newPassword,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                messageApi.open({
                    type: 'error',
                    content: data.error || 'Failed to change password',
                });
            } else {
                messageApi.open({
                    type: 'success',
                    content: 'Password changed successfully',
                });
                setOpen(false); // 成功关闭弹窗
                form.resetFields(); // 关键：重置表单
            }
        } catch (err) {
            console.error(err);
            if (err.errorFields) return; // validateFields校验失败
            messageApi.open({
                type: 'error',
                content: 'Network error',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setOpen(false);
        form.resetFields();
    };

    return (
        <Modal
            title="Change Password"
            open={open}
            onOk={handleOk}
            confirmLoading={loading}
            onCancel={handleCancel}
        >
            {contextHolder}
            <Form form={form} layout="vertical">
                <Form.Item
                    label="Old Password"
                    name="oldPassword"
                    rules={[{required: true, message: 'Please enter old password'}]}
                >
                    <Input.Password/>
                </Form.Item>

                <Form.Item
                    label="New Password"
                    name="newPassword"
                    rules={[{required: true, message: 'Please enter new password'}]}
                >
                    <Input.Password/>
                </Form.Item>
            </Form>
        </Modal>
    );
}

'use client';

import 'antd/dist/reset.css';
import {Card, Button, Form, Input, message} from 'antd';
import {decodeJwt} from "jose";
import {useAuth} from "@/app/contexts/AuthContext";

export default function Login() {
    const [messageApi, contextHolder] = message.useMessage();
    const { setUser } = useAuth();

    const onFinish = async (values) => {
        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(values),
            });

            // 安全解析 JSON
            let data;
            try {
                data = await res.json();
            } catch {
                data = {error: res.statusText};
            }

            if (!res.ok) {
                messageApi.open({
                    type: 'error',
                    content: data.error || 'Login failed',
                });
                return;
            }

            const token = data.token;
            const decoded = decodeJwt(token);
            setUser(decoded);

            messageApi.open({
                type: 'success',
                content: data.message,
            });

            // 成功后重定向
            window.location.href = '/dashboard';
        } catch (error) {
            console.error(error);
            messageApi.open({
                type: 'error',
                content: 'Network error',
            });
        }
    };

    const onFinishFailed = (errorInfo) => {
        console.log('Failed:', errorInfo);
    };

    return (
        <div
            style={{
                backgroundColor: '#f0f2f5',
                height: '100vh',
                width: '100vw',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
            }}
        >
            {/* 必须渲染 contextHolder */}
            {contextHolder}

            <Card title="Login" variant="borderless" style={{width: 450}}>
                <Form
                    name="basic"
                    labelCol={{span: 8}}
                    wrapperCol={{span: 16}}
                    style={{maxWidth: 600}}
                    initialValues={{remember: true}}
                    onFinish={onFinish}
                    onFinishFailed={onFinishFailed}
                    autoComplete="off"
                >
                    <Form.Item
                        label="Username"
                        name="username"
                        rules={[{required: true, message: 'Please input your username!'}]}
                    >
                        <Input/>
                    </Form.Item>

                    <Form.Item
                        label="Password"
                        name="password"
                        rules={[{required: true, message: 'Please input your password!'}]}
                    >
                        <Input.Password/>
                    </Form.Item>

                    <Form.Item label={null}>
                        <Button type="primary" htmlType="submit">
                            Submit
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
}

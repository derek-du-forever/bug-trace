'use client';

import { AntdRegistry } from '@ant-design/nextjs-registry';
import { Layout, Menu, Breadcrumb } from 'antd';
import React from 'react';

const { Header, Content, Footer } = Layout;

const items = [
    {
        key: 'mail',
        label: 'Navigation One',
    },
];

export default function ClientLayout({ children }) {
    return (
        <Layout>
            <Header style={{ display: 'flex', alignItems: 'center' }}>
                <div className="demo-logo" />
                <Menu
                    theme="dark"
                    mode="horizontal"
                    defaultSelectedKeys={['2']}
                    items={items}
                    style={{ flex: 1, minWidth: 0 }}
                />
            </Header>
            <Content style={{ padding: '0 48px' }}>
                <div
                    style={{
                        background: '#fff',
                        minHeight: 280,
                        padding: 24,
                        borderRadius: 8,
                    }}
                >
                    <AntdRegistry>{children}</AntdRegistry>
                </div>
            </Content>
            <Footer style={{ textAlign: 'center' }}>
                Ant Design ©{new Date().getFullYear()} Created by Ant UED
            </Footer>
        </Layout>
    );
}

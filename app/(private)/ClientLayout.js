'use client';

import { AntdRegistry } from '@ant-design/nextjs-registry';
import { Layout, Menu } from 'antd';
import React from 'react';
import { useRouter, usePathname } from 'next/navigation';

const { Header, Content, Footer } = Layout;

const mainItems = [
    { key: 'Home', label: 'Home', url: '/dashboard' },
    { key: 'Users', label: 'Users', url: '/users' },
];

const rightItems = [{ key: 'Logout', label: 'Logout' }];

export default function ClientLayout({ children }) {
    const router = useRouter();
    const pathname = usePathname(); // 获取当前路径，用于菜单高亮

    const handleMainMenuClick = ({ key }) => {
        const item = mainItems.find(i => i.key === key);
        if (item) {
            router.push(item.url);
        }
    };

    const handleRightMenuClick = ({ key }) => {
        if (key === 'Logout') {
            // 退出逻辑
            console.log('Logout');
            router.push('/login');
        }
    };

    // 根据当前路径设置高亮
    const selectedKey = mainItems.find(i => pathname.startsWith(i.url))?.key || 'Home';

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Header style={{ display: 'flex', alignItems: 'center' }}>
                <div className="demo-logo" />
                <Menu
                    theme="dark"
                    mode="horizontal"
                    selectedKeys={[selectedKey]}
                    items={mainItems}
                    style={{ flex: 1, minWidth: 0 }}
                    onClick={handleMainMenuClick} // 点击跳转
                />
                <Menu
                    theme="dark"
                    mode="horizontal"
                    selectable={false}
                    items={rightItems}
                    onClick={handleRightMenuClick}
                />
            </Header>
            <Content style={{ padding: '0 48px' }}>
                <div
                    style={{
                        background: '#fff',
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

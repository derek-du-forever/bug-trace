"use client";

import {AntdRegistry} from "@ant-design/nextjs-registry";
import {Layout, Menu, message} from "antd";
import React, {useState} from "react";
import {useRouter, usePathname} from "next/navigation";
import ModalComponent from "@/app/(private)/change-password";
import {useAuth} from "@/app/contexts/AuthContext";

const {Header, Content, Footer} = Layout;


const getMainItems = (role) => {
    const items = [
        {key: "Home", label: "Home", url: "/dashboard"},
    ];

    if (role === "admin") {
        items.push({key: "Users", label: "Users", url: "/users"});
    }

    return items;
};
const rightItems = [
    {key: "Logout", label: "Logout"},
    {key: "ChangePassword", label: "Change Password"},
];

export default function ClientLayout({children}) {
    const router = useRouter();
    const {user, setUser} = useAuth();
    const pathname = usePathname();
    const [messageApi, contextHolder] = message.useMessage();
    const mainItems = getMainItems(user?.roles);
    const handleMainMenuClick = ({key}) => {
        const item = mainItems.find((i) => i.key === key);
        if (item) {
            router.push(item.url);
        }
    };

    const handleRightMenuClick = async ({key}) => {
        if (key === "Logout") {
            try {
                const res = await fetch("/api/logout", {method: "POST"});
                if (!res.ok) {
                    messageApi.open({
                        type: "error",
                        content: "Logout failed",
                    });
                    return;
                }

                setUser(null);

                router.push("/login");
            } catch (err) {
                console.error(err);
                messageApi.open({
                    type: "error",
                    content: "Logout failed",
                });
            }
            return;
        }
        if (key === "ChangePassword") {
            setOpen(true);
            return;
        }
        console.log(key);
    };

    const selectedKey =
        mainItems.find((i) => pathname.startsWith(i.url))?.key || "Home";

    const [open, setOpen] = useState(false);

    return (
        <Layout style={{minHeight: "100vh"}}>
            {contextHolder}
            <Header style={{display: "flex", alignItems: "center"}}>
                <div className="demo-logo"/>
                <Menu
                    theme="dark"
                    mode="horizontal"
                    selectedKeys={[selectedKey]}
                    items={mainItems}
                    style={{flex: 1, minWidth: 0}}
                    onClick={handleMainMenuClick}
                />
                <Menu
                    theme="dark"
                    mode="horizontal"
                    selectable={false}
                    items={rightItems}
                    onClick={handleRightMenuClick}
                />
                <div style={{color: "#fff", marginLeft: 16}}>
                    {user?.username} / {user?.displayName}
                </div>
            </Header>
            <Content style={{padding: "0 48px"}}>
                <div
                    style={{
                        background: "#fff",
                        padding: 24,
                        borderRadius: 8,
                    }}
                >
                    <AntdRegistry>{children}</AntdRegistry>
                </div>
                <ModalComponent open={open} setOpen={setOpen}/>
            </Content>
            <Footer style={{textAlign: "center"}}>
                Ant Design ©{new Date().getFullYear()} Created by Ant UED
            </Footer>
        </Layout>
    );
}

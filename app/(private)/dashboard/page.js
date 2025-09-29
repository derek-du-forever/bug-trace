"use client";

import { useMemo } from "react";
import { useAuth } from "@/app/contexts/AuthContext";
import AdminDashboard from "./admin-dashboard";
import DeveloperDashboard from "./developer-dashboard";
import TesterDashboard from "./tester-dashboard";

export default function DashboardPage() {
    const { user } = useAuth();

    const role = useMemo(() => {
        if (!user) return null;
        // 兼容 roles 可能是字符串或数组
        const r = Array.isArray(user.roles) ? user.roles[0] : user.roles;
        return r || null;
    }, [user]);

    if (!user) return <div>Loading...</div>;

    if (role === "admin") return <AdminDashboard />;
    if (role === "developer") return <DeveloperDashboard />;
    if (role === "tester") return <TesterDashboard />;

    return <div>Unknown role: {String(role)}</div>;
}

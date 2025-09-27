"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import jwt from "jsonwebtoken";

const AuthContext = createContext({ user: null, setUser: () => {} });

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);

    useEffect(() => {
        // 从 cookie 读取 token
        const token = document.cookie
            .split("; ")
            .find((row) => row.startsWith("token="))
            ?.split("=")[1];

        if (token) {
            try {
                const decoded = jwt.decode(token); // 前端只解码，不验证 SECRET_KEY
                setUser(decoded);
            } catch (err) {
                setUser(null);
            }
        }
    }, []);

    return (
        <AuthContext.Provider value={{ user, setUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}

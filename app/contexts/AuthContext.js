'use client';

import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext({ user: null, setUser: () => {} });

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await fetch('/api/me');
                if (!res.ok) {
                    console.error(res.message);
                }


                const data = await res.json();
                setUser(data.user || null);
            } catch (err) {
                console.error("Error fetching user:", err);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, []);

    return (
        <AuthContext.Provider value={{ user, setUser, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}

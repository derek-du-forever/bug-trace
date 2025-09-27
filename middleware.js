import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SECRET_KEY = new TextEncoder().encode(process.env.SECRET_KEY); // jose 需要 Uint8Array

export async function middleware(req) {
    const token = req.cookies.get("token")?.value;
    const { pathname } = req.nextUrl;

    let user = null;
    if (token) {
        try {
            const { payload } = await jwtVerify(token, SECRET_KEY);
            user = payload; // token 验证通过，保存用户信息
        } catch (err) {
            user = null; // 验证失败
        }
    }

    const isPrivateRoute =
        pathname.startsWith("/dashboard") || pathname.startsWith("/profile");

    // 根路径
    if (pathname === "/") {
        const url = req.nextUrl.clone();
        url.pathname = user ? "/dashboard" : "/login";
        return NextResponse.redirect(url);
    }

    // 私有页未登录
    if (isPrivateRoute && !user) {
        const url = req.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
    }

    // 已登录访问登录页
    if ((pathname === "/login" || pathname === "/register") && user) {
        const url = req.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
    }

    return NextResponse.next();
}

/*
export const config = {
    matcher: [
        "/",
        "/login",
        "/register",
        "/dashboard/:path*",
        "/profile/:path*",
    ],
};
*/

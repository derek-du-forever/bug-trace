import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SECRET_KEY = new TextEncoder().encode(process.env.SECRET_KEY);

export async function middleware(req) {
    const token = req.cookies.get("token")?.value;
    const { pathname } = req.nextUrl;

    let user = null;
    if (token) {
        try {
            const { payload } = await jwtVerify(token, SECRET_KEY);
            user = payload;
        } catch (err) {
            user = null;
        }
    }

    const isPrivateRoute =
        pathname.startsWith("/dashboard") || pathname.startsWith("/profile");

    if (pathname === "/") {
        const url = req.nextUrl.clone();
        url.pathname = user ? "/dashboard" : "/login";
        return NextResponse.redirect(url);
    }

    if (isPrivateRoute && !user) {
        const url = req.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
    }

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

import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

const SECRET_KEY = new TextEncoder().encode(process.env.SECRET_KEY); // jose 需要 Uint8Array

export async function POST(req) {
    const { username, password } = await req.json();

    // 查询用户
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
        return NextResponse.json(
            { error: "username or password is wrong" },
            { status: 401 } // 未授权
        );
    }

    // 校验密码
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        return NextResponse.json(
            { error: "username or password is wrong" },
            { status: 401 }
        );
    }

    // 使用 jose 生成 token
    const token = await new SignJWT({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        roles: user.roles
    })
        .setProtectedHeader({ alg: "HS256", typ: "JWT" })
        .setIssuedAt()
        .setExpirationTime("1d")
        .sign(SECRET_KEY);

    // 返回响应并设置 cookie
    const res = NextResponse.json({ token, message: "Login success" });
    res.cookies.set("token", token, {
        httpOnly: true,
        path: "/",
        maxAge: 60 * 60 * 24,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
    });

    return res;
}

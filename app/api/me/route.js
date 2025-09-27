// app/api/me/route.js
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SECRET_KEY = new TextEncoder().encode(process.env.SECRET_KEY);

export async function GET(req) {
    const token = req.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ user: null });

    try {
        const { payload } = await jwtVerify(token, SECRET_KEY);
        return NextResponse.json({ user: payload });
    } catch {
        return NextResponse.json({ user: null });
    }
}

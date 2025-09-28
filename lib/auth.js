// lib/auth.js
import { jwtVerify } from "jose";

const SECRET_KEY = new TextEncoder().encode(process.env.SECRET_KEY);

export async function getUserFromReq(req) {
    const token = req.cookies.get?.("token")?.value || req.cookies?.token;
    if (!token) return null;

    try {
        const { payload } = await jwtVerify(token, SECRET_KEY);
        return payload;
    } catch {
        return null;
    }
}

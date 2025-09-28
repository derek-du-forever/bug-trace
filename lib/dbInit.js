// lib/dbInit.js
import { prisma } from "./prisma";
import { ulid } from "ulid";
import bcrypt from "bcrypt";
const saltRounds = 10;

export async function initDb() {
    const admin = await prisma.user.findUnique({
        where: { username: "admin" },
    });
    if (!admin) {
        await prisma.user.create({
            data: {
                id: ulid(),
                username: "admin",
                displayName: "Administrator",
                password: await bcrypt.hash("123qwe", saltRounds),
                roles: "admin",
            },
        });
    }
}

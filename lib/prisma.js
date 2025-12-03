// lib/prisma.js
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        log: ["error", "warn"], // 如需调试可改为 ["query", "error", "warn"]
    });

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}

// ⭐⭐ 必须导出 default，否则 API 会报错
export default prisma;

// 额外导出命名 prisma（可选）
export { prisma };

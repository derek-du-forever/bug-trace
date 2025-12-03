// lib/prisma.js
import { PrismaClient } from "@prisma/client";

// 让 TypeScript / JS 支持 global 变量扩展
const globalForPrisma = globalThis;

// ⭐ 防止多实例（Turbopack + RSC 下必须这样写）
let prisma = globalForPrisma.__PRISMA__ || null;

if (!prisma) {
    prisma = new PrismaClient({
        log: ["error", "warn"],  // 可加入 "query" 调试
        datasources: {
            db: {
                // 防止 serverless PG 在 idle 时断线
                url: process.env.DATABASE_URL + "?connection_limit=1&pool_timeout=30",
            },
        },
    });

    // 只在 dev 模式缓存到 global
    if (process.env.NODE_ENV !== "production") {
        globalForPrisma.__PRISMA__ = prisma;
    }
}

// ⭐ 处理 serverless 连接 auto-close 的自动恢复
async function ensureConnection() {
    try {
        await prisma.$queryRaw`SELECT 1`;
    } catch (err) {
        console.error("💥 Prisma lost connection, recreating client...", err);

        prisma = new PrismaClient({
            log: ["error", "warn"],
        });

        if (process.env.NODE_ENV !== "production") {
            globalForPrisma.__PRISMA__ = prisma;
        }
    }
}

ensureConnection();

export default prisma;
export { prisma };

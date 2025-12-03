import {PrismaClient} from "@prisma/client";

const globalForPrisma = globalThis;

let prisma = globalForPrisma.__PRISMA__ || null;

if (!prisma) {
    prisma = new PrismaClient({
        log: ["error", "warn"],
        datasources: {
            db: {
                url: process.env.DATABASE_URL + "?connection_limit=1&pool_timeout=30",
            },
        },
    });

    if (process.env.NODE_ENV !== "production") {
        globalForPrisma.__PRISMA__ = prisma;
    }
}

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
export {prisma};

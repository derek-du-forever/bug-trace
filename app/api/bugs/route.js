import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guard";

export async function GET(req) {
    try {
        const user = await requireUser(req);
        const url = new URL(req.url);

        const status = url.searchParams.get("status") || undefined;
        const priority = url.searchParams.get("priority") || undefined;
        const severity = url.searchParams.get("severity") || undefined;
        const page = Math.max(1, Number(url.searchParams.get("page") || 1));
        const pageSize = Math.min(
            100,
            Math.max(1, Number(url.searchParams.get("pageSize") || 10))
        );

        // Base filtering conditions
        const whereBase = {};
        if (status) whereBase.status = status;
        if (priority) whereBase.priority = priority;
        if (severity) whereBase.severity = severity;

        // Role-based filtering
        let where = whereBase;

        if (user.roles === "developer") {
            // Developers: only see bugs assigned to them
            where = { ...whereBase, assigneeId: user.id };
        } else if (user.roles !== "admin") {
            // Testers: only see bugs they created
            where = { ...whereBase, creatorId: user.id };
        }
        // Admins: see everything (no additional filtering)

        // ----------------------------------------------------
        // 🔍 Debug logging (English version)
        // ----------------------------------------------------
        console.log("===== 🔍 /api/bugs Debug Log — START =====");
        console.log("👤 Current User:", {
            id: user.id,
            username: user.username,
            role: user.roles,
        });
        console.log("🌐 Request URL:", req.url);
        console.log("🔎 Query Params:", {
            status,
            priority,
            severity,
            page,
            pageSize,
        });
        console.log("🧩 Base Filter:", whereBase);
        console.log("🎯 Final Prisma `where` Condition:", where);
        console.log("📄 Pagination:", {
            skip: (page - 1) * pageSize,
            take: pageSize,
        });
        console.log("===== 🔍 /api/bugs Debug Log — END =====");

        // Query database
        const [rows, total] = await Promise.all([
            prisma.bug.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * pageSize,
                take: pageSize,
                select: {
                    id: true,
                    title: true,
                    status: true,
                    priority: true,
                    severity: true,
                    createdAt: true,
                    updatedAt: true,
                    creatorId: true,
                    assigneeId: true,
                    description: true,
                },
            }),
            prisma.bug.count({ where }),
        ]);

        console.log(`📦 Query Result: rows=${rows.length}, total=${total}`);

        // Load creator + assignee info
        const userIds = Array.from(
            new Set(
                rows.flatMap((b) => [b.creatorId, b.assigneeId].filter(Boolean))
            )
        );

        const users =
            userIds.length > 0
                ? await prisma.user.findMany({
                    where: { id: { in: userIds } },
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                    },
                })
                : [];

        const map = Object.fromEntries(users.map((u) => [u.id, u]));

        // Attach user info
        const items = rows.map((b) => ({
            ...b,
            creator: b.creatorId ? map[b.creatorId] ?? null : null,
            assignee: b.assigneeId ? map[b.assigneeId] ?? null : null,
        }));

        return NextResponse.json({
            items,
            total,
            page,
            pageSize,
        });
    } catch (err) {
        console.error("🔥 GET /api/bugs error:", err);
        return NextResponse.json(
            {
                error: "Failed to fetch bugs.",
                detail: String(err?.message || err),
            },
            { status: 500 }
        );
    }
}

// POST /api/bugs
export async function POST(req) {
    const user = await requireUser(req);
    const body = await req.json();

    // Create bug
    const bug = await prisma.bug.create({
        data: {
            title: body.title,
            priority: body.priority,
            severity: body.severity,
            description: body.description || "",
            creatorId: user.id,
        },
    });

    // Write history
    await prisma.bugHistory.create({
        data: {
            bugId: bug.id,
            userId: user.id,
            action: "created",
            oldValue: null,
            newValue: JSON.stringify({
                title: bug.title,
                priority: bug.priority,
                severity: bug.severity,
                description: bug.description
            }),
        },
    });

    return NextResponse.json(bug);
}


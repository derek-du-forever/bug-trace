import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ulid } from "ulid";
import { requireUser } from "@/lib/guard";

export async function GET(req) {
  try {
    const user = await requireUser(req);
    const url = new URL(req.url);

    const status   = url.searchParams.get("status")   || undefined;  // 枚举: open/in_progress/...
    const priority = url.searchParams.get("priority") || undefined;  // 枚举: low/medium/...
    const severity = url.searchParams.get("severity") || undefined;  // 枚举: minor/major/critical
    const page     = Math.max(1, Number(url.searchParams.get("page") || 1));
    const sizeRaw  = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") || 10)));
    const pageSize = sizeRaw;

    // 不用 AND 数组，逐项拼 where
    const whereBase = {};
    if (status)   whereBase.status   = status;
    if (priority) whereBase.priority = priority;
    if (severity) whereBase.severity = severity;

    // 角色隔离
    let where = whereBase;
    if (user.roles === "developer") where = { ...whereBase, assigneeId: user.id };
    else if (user.roles !== "admin") where = { ...whereBase, creatorId: user.id };

    // 先查 Bug（只查原始字段）
    const [rows, total] = await Promise.all([
      prisma.bug.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true, title: true, status: true, priority: true, severity: true,
          createdAt: true, updatedAt: true,
          creatorId: true, assigneeId: true,
        },
      }),
      prisma.bug.count({ where }),
    ]);

    // 手动补全用户信息
    const userIds = Array.from(
      new Set(rows.flatMap(b => [b.creatorId, b.assigneeId].filter(Boolean)))
    );
    const users = userIds.length
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, username: true, displayName: true },
        })
      : [];
    const map = Object.fromEntries(users.map(u => [u.id, u]));
    const items = rows.map(b => ({
      ...b,
      creator:  b.creatorId  ? map[b.creatorId]  ?? null : null,
      assignee: b.assigneeId ? map[b.assigneeId] ?? null : null,
    }));

    return NextResponse.json({ items, total, page, pageSize });
  } catch (err) {
    console.error("GET /api/bugs error:", err);
    return NextResponse.json(
      { error: "Failed to fetch bugs", detail: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}



export async function POST(req) {
  const user = await requireUser(req);
  if (user.roles !== "tester") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ✅ 只读取一次 JSON
  let body;
  try {
    body = await req.json();
    console.log("📥 Parsed body:", body);
  } catch (err) {
    console.error("❌ JSON parse error:", err);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { title, description, priority = "medium", severity = "minor" } = body;

  if (!title || !description) {
    console.warn("⚠️ Missing required fields:", { title, description });
    return NextResponse.json(
      { error: "title/description required" },
      { status: 400 }
    );
  }

  try {
    // 第一步：创建 bug
    const bugId = ulid();
    const bug = await prisma.bug.create({
      data: {
        id: ulid(),
        title,
        description,
        priority,
        severity,
        status: "open",
        creatorId: user.id,
      },
      select: { id: true, title: true, status: true },
    });
    // 第二步：插入一条历史记录（手动）
    await prisma.bugHistory.create({
      data: {
        id: ulid(),
        bugId,               // 手动绑定 bugId
        userId: user.id,
        action: "created",
        newValue: "open",
      },
    });

    console.log("🐛 Created bug with history:", bug);
    return NextResponse.json(bug, { status: 201 });
  } catch (err) {
    console.error("🔥 Prisma create error:", err);
    return NextResponse.json(
      { error: "Failed to create bug", detail: err.message },
      { status: 500 }
    );
  }
}
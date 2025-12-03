import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/guard";

export async function GET(req, context) {
  await requireUser(req);

  // ⭐ Next.js 15 必须 await context.params
  const { id } = await context.params;

  try {
    // 1. 获取历史记录（无关联，只能取 userId）
    const history = await prisma.bugHistory.findMany({
      where: { bugId: id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        action: true,
        oldValue: true,
        newValue: true,
        createdAt: true,
        userId: true,     // ⭐ 用 userId，而不是 user
      },
    });

    // 2. 批量查询用户信息（手动 JOIN）
    const userIds = [...new Set(history.map(h => h.userId))];

    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        username: true,
        displayName: true,
      },
    });

    // 3. 拼接 user 信息（手动 JOIN，而非 Prisma JOIN）
    const result = history.map(h => ({
      ...h,
      user: users.find(u => u.id === h.userId) || null,
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error("🔥 History API Error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

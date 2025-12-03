import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/guard";

export async function GET(req, context) {
  await requireUser(req);

  const { id } = await context.params;

  try {
    const history = await prisma.bugHistory.findMany({
      where: { bugId: id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        action: true,
        oldValue: true,
        newValue: true,
        createdAt: true,
        userId: true,
      },
    });

    const userIds = [...new Set(history.map(h => h.userId))];

    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        username: true,
        displayName: true,
      },
    });

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

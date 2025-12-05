import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guard";

export async function GET(req, context) {
  await requireUser(req); 

  const { id } = await context.params;

  const history = await prisma.bugHistory.findMany({
    where: { bugId: id },
    orderBy: { createdAt: "desc" },
  });

  const userIds = [...new Set(history.map((h) => h.userId))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, username: true, displayName: true },
  });

  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  const final = history.map((h) => ({
    ...h,
    user: userMap[h.userId] ?? null,
  }));

  return NextResponse.json(final);
}

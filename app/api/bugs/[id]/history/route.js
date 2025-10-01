import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guard";

export async function GET(req, { params }) {
  await requireUser(req);
  const { id } = params;
  const items = await prisma.bugHistory.findMany({
    where: { bugId: id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true, action: true, oldValue: true, newValue: true, createdAt: true,
      user: { select: { id: true, username: true, displayName: true } },
    },
  });
  return NextResponse.json(items);
}

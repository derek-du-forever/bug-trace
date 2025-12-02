import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ulid } from "ulid";
import { requireUser } from "@/lib/guard";

export async function GET(req, { params }) {
  await requireUser(req);
  const { id } = params;
  const comments = await prisma.bugComment.findMany({
    where: { bugId: id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true, content: true, createdAt: true,
      user: { select: { id: true, username: true, displayName: true } },
    },
  });
  return NextResponse.json(comments);
}

export async function POST(req, { params }) {
  const user = await requireUser(req);
  const { id } = params;
  const { content } = await req.json();
  if (!content) return NextResponse.json({ error: "content required" }, { status: 400 });

  const created = await prisma.bugComment.create({
    data: { id: ulid(), bugId: id, userId: user.id, content },
  });

  await prisma.bugHistory.create({
    data: {
      id: ulid(),
      bugId: id,
      userId: user.id,
      action: "commented",
      newValue: content.slice(0, 200),
    },
  });

  return NextResponse.json({ id: created.id });
}

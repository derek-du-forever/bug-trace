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
      id: true,
      content: true,
      createdAt: true,
      user: { select: { id: true, username: true, displayName: true } },
    },
  });

  return NextResponse.json(comments);
}

export async function POST(req, { params }) {
  const user = await requireUser(req);
  const { id } = params;   // bugId 正确来源
  const { content } = await req.json();

  if (!content) {
    return NextResponse.json({ error: "content required" }, { status: 400 });
  }

  // 1. 创建评论
  const created = await prisma.bugComment.create({
    data: {
      id: ulid(),
      bugId: id,
      userId: user.id,
      content,
    },
  });

  // 2. 取上一条评论历史（修复关键 bug）
  const lastCommentHistory = await prisma.bugHistory.findFirst({
    where: {
      bugId: id,          // ⭐ 修复点：必须使用 id
      action: "commented",
    },
    orderBy: { createdAt: "desc" },
  });

  // 3. 写入历史记录
  await prisma.bugHistory.create({
    data: {
      id: ulid(),
      bugId: id,
      userId: user.id,
      action: "commented",
      oldValue: lastCommentHistory?.newValue ?? null,  // ⭐ Old 显示上一条评论内容
      newValue: content.slice(0, 200),                 // ⭐ New = 当前评论
    },
  });

  return NextResponse.json({ id: created.id });
}

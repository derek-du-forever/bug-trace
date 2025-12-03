import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ulid } from "ulid";
import { requireRole } from "@/lib/guard";

export async function PUT(req, { params }) {
  const user = await requireRole(req, ["admin", "tester"]); // 执行操作的人
  const { id } = params; // bugId
  const { developerId } = await req.json();

  if (!developerId) {
    return NextResponse.json({ error: "developerId required" }, { status: 400 });
  }

  // 1. 新 assignee 是否存在？
  const newAssignee = await prisma.user.findUnique({
    where: { id: developerId },
    select: { id: true, username: true, displayName: true }
  });

  if (!newAssignee) {
    return NextResponse.json({ error: "Developer not found" }, { status: 400 });
  }

  // 2. 取旧 assignee
  const bugBefore = await prisma.bug.findUnique({
    where: { id },
    select: { assigneeId: true }
  });

  let oldAssigneeUser = null;

  if (bugBefore?.assigneeId) {
    oldAssigneeUser = await prisma.user.findUnique({
      where: { id: bugBefore.assigneeId },
      select: { id: true, username: true, displayName: true }
    });
  }

  // 3. 更新 bug
  const updatedBug = await prisma.bug.update({
    where: { id },
    data: {
      assigneeId: developerId,
      status: "assigned",
    },
  });

  // 4. 写入 history（⭐ 不依赖外键，不改数据库结构）
  await prisma.bugHistory.create({
    data: {
      id: ulid(),
      bugId: id,
      userId: user.id, // 谁执行的动作
      action: "assigned",
      oldValue: oldAssigneeUser?.displayName ?? null,
      newValue: newAssignee.displayName,
    },
  });

  return NextResponse.json({
    id: updatedBug.id,
    status: updatedBug.status,
    assigneeId: updatedBug.assigneeId,
  });
}

import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/guard";
import { ulid } from "ulid";

export async function PUT(req, { params }) {
  const user = await requireUser(req);
  const { id } = params;
  const { status } = await req.json();

  // 1. 获取旧状态
  const bug = await prisma.bug.findUnique({
    where: { id },
    select: { status: true },
  });

  if (!bug) {
    return Response.json({ error: "Bug not found" }, { status: 404 });
  }

  // ⭐ 2. 允许修改成任何合法状态（包括 open / assigned）
  const updated = await prisma.bug.update({
    where: { id },
    data: { status },
  });

  // 3. 写入历史记录
  await prisma.bugHistory.create({
    data: {
      id: ulid(),
      bugId: id,
      userId: user.id,
      action: "status_changed",
      oldValue: bug.status,
      newValue: status,
    },
  });

  return Response.json(updated);
}

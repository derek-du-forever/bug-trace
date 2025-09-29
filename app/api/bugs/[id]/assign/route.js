import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ulid } from "ulid";
import { requireRole } from "@/lib/guard";

export async function PUT(req, { params }) {
  const user = await requireRole(req, ["admin", "tester"]); // ✅ 允许 admin/tester
  const { id } = params; // bugId
  const { developerId } = await req.json();

  console.log("Receive assign:", id, "to developerId:", developerId);

  if (!developerId) {
    return NextResponse.json({ error: "developerId required" }, { status: 400 });
  }

  // 校验 developer 是否存在
  const dev = await prisma.user.findUnique({ where: { id: developerId } });
  if (!dev) {
    return NextResponse.json({ error: "Developer not found" }, { status: 400 });
  }

  try {
    // 1️⃣ 更新 bug
    const bug = await prisma.bug.update({
      where: { id },
      data: {
        assigneeId: developerId,
        status: "assigned",
      },
    });

    // 2️⃣ 单独写入 history
    await prisma.bugHistory.create({
      data: {
        id: ulid(),
        bugId: id,
        userId: user.id,
        action: "assigned",
        newValue: `assigned:${developerId}`,
      },
    });

    return NextResponse.json({
      id: bug.id,
      status: bug.status,
      assigneeId: bug.assigneeId,
    });
  } catch (err) {
    console.error("Assign error:", err);
    return NextResponse.json(
      { error: "Failed to assign", detail: err.message },
      { status: 500 }
    );
  }
}

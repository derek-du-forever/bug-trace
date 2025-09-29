import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ulid } from "ulid";
import { requireRole, requireUser } from "@/lib/guard";

export async function PUT(req, { params }) {
  const admin = await requireRole(req, "admin");
  const { id } = params;
  const { developerId } = await req.json();
  if (!developerId) {
    return NextResponse.json({ error: "developerId required" }, { status: 400 });
  }

  const bug = await prisma.bug.update({
    where: { id },
    data: {
      assigneeId: developerId,
      status: "assigned",
      histories: {
        create: {
          id: ulid(),
          userId: admin.id,
          action: "assigned",
          newValue: `assigned:${developerId}`,
        },
      },
    },
  });

  return NextResponse.json({ id: bug.id, status: bug.status, assigneeId: bug.assigneeId });
}

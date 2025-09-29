import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ulid } from "ulid";
import { requireRole } from "@/lib/guard";

const ALLOW = new Set(["in_progress", "resolved", "rejected", "closed"]);

export async function PUT(req, { params }) {
  const dev = await requireRole(req, "developer");
  const { id } = params;
  const { status } = await req.json();

  if (!ALLOW.has(status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }

  const bug = await prisma.bug.findUnique({ where: { id } });
  if (!bug || bug.assigneeId !== dev.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await prisma.bug.update({
    where: { id },
    data: {
      status,
      histories: {
        create: {
          id: ulid(),
          userId: dev.id,
          action: "status_changed",
          oldValue: bug.status,
          newValue: status,
        },
      },
    },
  });

  return NextResponse.json({ id: updated.id, status: updated.status });
}

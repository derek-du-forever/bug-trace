import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ulid } from "ulid";
import { requireUser } from "@/lib/guard";

export async function GET(req) {
  const user = await requireUser(req);
  const { searchParams } = new URL(req.url);
  const status   = searchParams.get("status") || "";
  const priority = searchParams.get("priority") || "";
  const severity = searchParams.get("severity") || "";
  const page     = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const rawSize  = parseInt(searchParams.get("pageSize") || "10", 10);
  const pageSize = Math.min(Math.max(1, rawSize), 100);

  const whereBase = {
    AND: [
      status   ? { status }   : {},
      priority ? { priority } : {},
      severity ? { severity } : {},
    ],
  };

  let where;
  if (user.roles === "admin") {
    where = whereBase;
  } else if (user.roles === "developer") {
    where = { ...whereBase, assigneeId: user.id };
  } else {
    where = { ...whereBase, creatorId: user.id };
  }

  const [items, total] = await Promise.all([
    prisma.bug.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, title: true, status: true, priority: true, severity: true,
        createdAt: true, updatedAt: true,
        creator:  { select: { id: true, username: true, displayName: true } },
        assignee: { select: { id: true, username: true, displayName: true } },
      },
    }),
    prisma.bug.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, pageSize });
}

export async function POST(req) {
  const user = await requireUser(req);
  if (user.roles !== "tester") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { title, description, priority = "medium", severity = "minor" } = await req.json();
  if (!title || !description) {
    return NextResponse.json({ error: "title/description required" }, { status: 400 });
  }

  const bug = await prisma.bug.create({
    data: {
      id: ulid(),
      title, description, priority, severity,
      status: "open",
      creatorId: user.id,
      histories: {
        create: {
          id: ulid(),
          userId: user.id,
          action: "created",
          newValue: "open",
        },
      },
    },
    select: { id: true },
  });

  return NextResponse.json(bug, { status: 201 });
}

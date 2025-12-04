import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guard";
import { ulid } from "ulid";

export async function POST(req, context) {
    const user = await requireUser(req);
    const { id } = await context.params;
    const { content } = await req.json();

    if (!content) {
        return NextResponse.json({ error: "content required" }, { status: 400 });
    }

    const bug = await prisma.bug.findUnique({
        where: { id },
        select: { description: true },
    });

    if (!bug) {
        return NextResponse.json({ error: "Bug not found" }, { status: 404 });
    }

    const oldDesc = bug.description || "-";

    const updated = await prisma.bug.update({
        where: { id },
        data: { description: content },
    });

    await prisma.bugHistory.create({
        data: {
            id: ulid(),
            bugId: id,
            userId: user.id,
            action: "commented",
            oldValue: oldDesc,
            newValue: content,
        },
    });

    return NextResponse.json({
        success: true,
        id: updated.id,
        description: updated.description,
    });
}

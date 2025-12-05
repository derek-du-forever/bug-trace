import {NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
import {ulid} from "ulid";
import {requireRole} from "@/lib/guard";

export async function PUT(req, context) {
    const user = await requireRole(req, ["admin", "tester"]);

    const {id} = await context.params;

    const {developerId} = await req.json();
    //get old bug info
    const oldBug = await prisma.bug.findUnique({
        where: {id},
        select: {assigneeId: true}
    });
    let oldAssigneeName = "Unassigned";

    if (oldBug?.assigneeId) {
        const oldUser = await prisma.user.findUnique({
            where: { id: oldBug.assigneeId },
            select: { username: true, displayName: true }
        });

        if (oldUser) {
            oldAssigneeName = oldUser.displayName || oldUser.username;
        }
    }

    const newDev = await prisma.user.findUnique({
        where: {id: developerId},
        select: {
            username: true,
            displayName: true
        }
    });

    if (!newDev) {
        return NextResponse.json({error: "Developer not found"}, {status: 400});
    }

    const newAssigneeName = newDev.displayName || newDev.username;

    console.log("Receive assign:", oldAssigneeName, "to developerId:", newAssigneeName);
    try {
        const bug = await prisma.bug.update({
            where: {id},
            data: {
                assigneeId: developerId,
                status: "assigned",
            },
        });

        await prisma.bugHistory.create({
            data: {
                id: ulid(),
                bugId: id,
                userId: user.id,
                action: "assigned",
                newValue: newAssigneeName,
                oldValue: oldAssigneeName || null,
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
            {error: "Failed to assign", detail: err.message},
            {status: 500}
        );
    }
}


import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export async function DELETE(req, { params }) {
    try {
        const id = params.id;

        if (!id) {
            return NextResponse.json(
                { error: "Bug ID is required" },
                { status: 400 }
            );
        }

        const authResult = await verifyToken(req);
        if (!authResult.success) {
            return NextResponse.json(
                { error: authResult.error || "Authentication required" },
                { status: 401 }
            );
        }

        const currentUser = authResult.user;

        const bug = await prisma.bug.findUnique({
            where: { id },
            include: {
                assignee: true,
                reporter: true
            }
        });

        if (!bug) {
            return NextResponse.json(
                { error: "Bug not found" },
                { status: 404 }
            );
        }

        const canDelete = currentUser.role === 'admin' ||
            bug.reporterId === currentUser.id ||
            bug.assigneeId === currentUser.id;

        if (!canDelete) {
            return NextResponse.json(
                { error: "Permission denied. You can only delete bugs you created, are assigned to, or you must be an admin." },
                { status: 403 }
            );
        }

        await prisma.$transaction(async (tx) => {
            await tx.bugComment.deleteMany({
                where: { bugId: id }
            });
            await tx.bug.delete({
                where: { id }
            });
        });

        return NextResponse.json(
            { message: "Bug deleted successfully" },
            { status: 200 }
        );

    } catch (error) {
        console.error("[DELETE BUG ERROR]", error);
        return NextResponse.json(
            { error: error.message || "Failed to delete bug" },
            { status: 500 }
        );
    }
}
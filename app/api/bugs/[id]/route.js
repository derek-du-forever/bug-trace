import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(req, { params }) {
    try {
        const id = params.id;

        if (!id) {
            return NextResponse.json(
                { error: "Bug ID is required" },
                { status: 400 }
            );
        }

        const bug = await prisma.bug.findUnique({
            where: { id },
        });

        if (!bug) {
            return NextResponse.json(
                { error: "Bug not found" },
                { status: 404 }
            );
        }

        await prisma.bug.delete({
            where: { id },
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

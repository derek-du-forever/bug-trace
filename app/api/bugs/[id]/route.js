import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(req, { params }) {
    try {
        console.log("[DELETE API] Called with params:", params);
        const id = params.id;

        if (!id) {
            console.log("[DELETE API] No ID provided");
            return NextResponse.json(
                { error: "Bug ID is required" },
                { status: 400 }
            );
        }

        console.log("[DELETE API] Attempting to find bug with ID:", id);

        // 检查Bug是否存在
        const bug = await prisma.bug.findUnique({
            where: { id },
        });

        if (!bug) {
            console.log("[DELETE API] Bug not found");
            return NextResponse.json(
                { error: "Bug not found" },
                { status: 404 }
            );
        }

        console.log("[DELETE API] Bug found, attempting to delete:", bug.title);

        // 尝试删除Bug（先删除相关数据避免外键约束错误）
        try {
            await prisma.$transaction(async (tx) => {
                // 删除相关评论
                await tx.bugComment.deleteMany({
                    where: { bugId: id }
                });
                console.log("[DELETE API] Deleted comments");

                // 删除相关历史记录
                await tx.bugHistory.deleteMany({
                    where: { bugId: id }
                });
                console.log("[DELETE API] Deleted history");

                // 删除Bug本身
                await tx.bug.delete({
                    where: { id }
                });
                console.log("[DELETE API] Deleted bug");
            });
        } catch (dbError) {
            console.error("[DELETE API] Database error:", dbError);
            return NextResponse.json(
                { error: "Database error: " + dbError.message },
                { status: 500 }
            );
        }

        console.log("[DELETE API] Successfully deleted bug");
        return NextResponse.json(
            { message: "Bug deleted successfully" },
            { status: 200 }
        );

    } catch (error) {
        console.error("[DELETE API] General error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to delete bug" },
            { status: 500 }
        );
    }
}
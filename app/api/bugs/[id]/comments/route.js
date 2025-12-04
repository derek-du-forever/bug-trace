// api/bugs/[id]/comments/route.js - 最简版本（不查询用户信息）

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guard";
import { ulid } from "ulid";

// GET /api/bugs/[id]/comments
export async function GET(req, context) {
    try {
        const user = await requireUser(req);
        const { id: bugId } = await context.params;

        const bug = await prisma.bug.findUnique({
            where: { id: bugId },
            select: { id: true, title: true }
        });

        if (!bug) {
            return NextResponse.json({ error: "Bug not found" }, { status: 404 });
        }
        const comments = await prisma.bugComment.findMany({
            where: { bugId },
            orderBy: { createdAt: 'asc' }
        });
        let commentsWithUsers = comments;
        if (comments.length > 0) {
            try {
                const userIds = [...new Set(comments.map(c => c.userId))];

                const users = await prisma.user.findMany({
                    where: { id: { in: userIds } },
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        roles: true,
                    }
                });
                const userMap = {};
                users.forEach(u => {
                    userMap[u.id] = u;
                });
                commentsWithUsers = comments.map(comment => ({
                    ...comment,
                    user: userMap[comment.userId] || {
                        id: comment.userId,
                        username: `Unknown-${comment.userId?.slice(-8)}`,
                        displayName: null,
                        roles: 'user'
                    }
                }));
            } catch (userError) {
                console.warn('Failed to fetch user info:', userError);
                commentsWithUsers = comments.map(comment => ({
                    ...comment,
                    user: {
                        id: comment.userId,
                        username: `User-${comment.userId?.slice(-8)}`,
                        displayName: null,
                        roles: 'user'
                    }
                }));
            }
        }
        return NextResponse.json({
            success: true,
            data: commentsWithUsers,
            total: commentsWithUsers.length
        });
    } catch (error) {
        console.error('Error fetching comments:', error);
        return NextResponse.json(
            { error: "Failed to fetch comments" },
            { status: 500 }
        );
    }
}

// POST /api/bugs/[id]/comments - 添加新评论
export async function POST(req, context) {
    try {
        const user = await requireUser(req);
        const { id: bugId } = await context.params;
        const { content } = await req.json();

        if (!content || content.trim().length === 0) {
            return NextResponse.json(
                { error: "Comment content is required" },
                { status: 400 }
            );
        }

        if (content.length > 2000) {
            return NextResponse.json(
                { error: "Comment content too long (max 2000 characters)" },
                { status: 400 }
            );
        }

        // 检查Bug是否存在
        const bug = await prisma.bug.findUnique({
            where: { id: bugId },
            select: { id: true, title: true }
        });

        if (!bug) {
            return NextResponse.json({ error: "Bug not found" }, { status: 404 });
        }

        // 创建评论（最简版本）
        const comment = await prisma.bugComment.create({
            data: {
                id: ulid(),
                content: content.trim(),
                bugId,
                userId: user.id,
            }
        });

        return NextResponse.json({
            success: true,
            data: comment,
            message: "Comment added successfully"
        });
    } catch (error) {
        console.error('Error creating comment:', error);
        return NextResponse.json(
            { error: "Failed to create comment" },
            { status: 500 }
        );
    }
}

// PUT /api/bugs/[id]/comments - 修改评论
export async function PUT(req, context) {
    try {
        const user = await requireUser(req);
        const { id: bugId } = await context.params;
        const { commentId, content } = await req.json();

        if (!commentId) {
            return NextResponse.json(
                { error: "Comment ID is required" },
                { status: 400 }
            );
        }

        if (!content || content.trim().length === 0) {
            return NextResponse.json(
                { error: "Comment content is required" },
                { status: 400 }
            );
        }

        if (content.length > 2000) {
            return NextResponse.json(
                { error: "Comment content too long (max 2000 characters)" },
                { status: 400 }
            );
        }

        // 查找评论
        const comment = await prisma.bugComment.findUnique({
            where: { id: commentId }
        });

        if (!comment) {
            return NextResponse.json({ error: "Comment not found" }, { status: 404 });
        }

        if (comment.bugId !== bugId) {
            return NextResponse.json(
                { error: "Comment does not belong to this bug" },
                { status: 400 }
            );
        }

        // 权限检查：只有评论作者或管理员可以修改
        if (comment.userId !== user.id && user.roles !== 'admin') {
            return NextResponse.json(
                { error: "You can only edit your own comments" },
                { status: 403 }
            );
        }

        // 更新评论
        const updatedComment = await prisma.bugComment.update({
            where: { id: commentId },
            data: {
                content: content.trim(),
            }
        });

        return NextResponse.json({
            success: true,
            data: updatedComment,
            message: "Comment updated successfully"
        });
    } catch (error) {
        console.error('Error updating comment:', error);
        return NextResponse.json(
            { error: "Failed to update comment" },
            { status: 500 }
        );
    }
}

// DELETE /api/bugs/[id]/comments - 删除评论
export async function DELETE(req, context) {
    try {
        const user = await requireUser(req);
        const { id: bugId } = await context.params;
        const { commentId } = await req.json();

        if (!commentId) {
            return NextResponse.json(
                { error: "Comment ID is required" },
                { status: 400 }
            );
        }

        // 查找评论
        const comment = await prisma.bugComment.findUnique({
            where: { id: commentId },
            select: {
                id: true,
                bugId: true,
                userId: true,
                content: true
            }
        });

        if (!comment) {
            return NextResponse.json({ error: "Comment not found" }, { status: 404 });
        }

        if (comment.bugId !== bugId) {
            return NextResponse.json(
                { error: "Comment does not belong to this bug" },
                { status: 400 }
            );
        }

        // 权限检查：只有评论作者或管理员可以删除
        if (comment.userId !== user.id && user.role !== 'admin') {
            return NextResponse.json(
                { error: "You can only delete your own comments" },
                { status: 403 }
            );
        }

        // 删除评论
        await prisma.bugComment.delete({
            where: { id: commentId }
        });

        return NextResponse.json({
            success: true,
            message: "Comment deleted successfully"
        });
    } catch (error) {
        console.error('Error deleting comment:', error);
        return NextResponse.json(
            { error: "Failed to delete comment" },
            { status: 500 }
        );
    }
}
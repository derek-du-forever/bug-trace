import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);

        const username = searchParams.get("username");
        const displayName = searchParams.get("displayName");
        const roles = searchParams.get("roles");
        const page = parseInt(searchParams.get("page") || "1", 10);
        const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);

        const where = {
            AND: [
                username
                    ? {
                          username: {
                              contains: username,
                              mode: "insensitive",
                          },
                      }
                    : {},
                displayName
                    ? {
                          displayName: {
                              contains: displayName,
                              mode: "insensitive",
                          },
                      }
                    : {},
                roles
                    ? {
                          roles: roles,
                      }
                    : {},
            ],
        };

        const total = await prisma.user.count({ where });

        const users = await prisma.user.findMany({
            where,
            skip: (page - 1) * pageSize,
            take: pageSize,
            orderBy: { id: "desc" },
            select: {
                id: true,
                username: true,
                displayName: true,
                roles: true,
            },
        });

        return NextResponse.json({
            data: users,
            pagination: {
                total,
                page,
                pageSize,
                totalPages: Math.ceil(total / pageSize),
            },
        });
    } catch (err) {
        console.error(err);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}

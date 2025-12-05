import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ulid } from "ulid";
import bcrypt from "bcrypt";
import { requireUser } from "@/lib/guard";

export async function GET(req) {
    const currentUser = await requireUser(req);

    const { searchParams } = new URL(req.url);
    const username = searchParams.get("username");
    const displayName = searchParams.get("displayName");
    const roles = searchParams.get("roles");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);

    const whereList = [];

    if (username) {
        whereList.push({
            username: { contains: username, mode: "insensitive" },
        });
    }

    if (displayName) {
        whereList.push({
            displayName: { contains: displayName, mode: "insensitive" },
        });
    }

    if (roles) {
        whereList.push({ roles });
    }

    if (currentUser.roles !== "admin") {
        whereList.push({
            roles: { not: "admin" },
        });
    }

    const where = { AND: whereList };

    const total = await prisma.user.count({ where });
    const users = await prisma.user.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { id: "desc" },
        select: { id: true, username: true, displayName: true, roles: true },
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
}

export async function POST(req) {
    const currentUser = await requireUser(req);
    const body = await req.json();

    if (currentUser.roles !== "admin" && body.roles === "admin") {
        return NextResponse.json(
            { error: "Permission denied: Cannot create admin user" },
            { status: 403 }
        );
    }

    const user = await prisma.user.create({
        data: {
            id: ulid(),
            username: body.username,
            displayName: body.displayName,
            roles: body.roles,
            password: await bcrypt.hash("123qwe", 10),
        },
        select: { id: true, username: true, displayName: true, roles: true },
    });

    return NextResponse.json(user);
}

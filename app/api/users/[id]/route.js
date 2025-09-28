import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req, { params }) {
    const { id } = params;
    const body = await req.json();
    const user = await prisma.user.update({
        where: { id },
        data: { displayName: body.displayName, roles: body.roles },
        select: { id: true, username: true, displayName: true, roles: true },
    });
    return NextResponse.json(user);
}

export async function DELETE(req, { params }) {
    const { id } = params;
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ message: "User deleted" });
}

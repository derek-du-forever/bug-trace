import {NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
import bcrypt from "bcrypt";
import {getUserFromReq} from "@/lib/auth";


export async function POST(req) {
    const {oldPassword, newPassword} = await req.json();
    const currentUser = await getUserFromReq(req);
    if (!currentUser) {
        return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }

    // 查询用户
    const user = await prisma.user.findUnique({where: {id: currentUser.id}});
    if (!user) {
        return NextResponse.json(
            {error: "user is not found"},
            {status: 404} // 未授权
        );
    }

    // 校验密码
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
        return NextResponse.json(
            {error: "old password is wrong"},
            {status: 500}
        );
    }

    // 更新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
        where: {id: user.id},
        data: {password: hashedPassword},
    });

    // 返回响应并设置 cookie
    return NextResponse.json({message: "success"});
}

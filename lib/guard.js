import { getUserFromReq } from "@/lib/auth";

export async function requireUser(req) {
  const user = await getUserFromReq(req);
  if (!user) {
    const err = new Error("Unauthorized");
    err.status = 401;
    throw err;
  }
  return user;
}

export async function requireRole(req, roles) {
  const user = await requireUser(req);
  const allowed = Array.isArray(roles) ? roles : [roles];
  if (!allowed.includes(user.roles)) {
    const err = new Error("Forbidden");
    err.status = 403;
    throw err;
  }
  return user;
}

export const isAdmin = (u) => u?.roles === "admin";
export const isDeveloper = (u) => u?.roles === "developer";
export const isTester = (u) => u?.roles === "tester";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/admin-auth";
import { prisma } from "@/src/lib/prisma";
import { jsonError } from "@/src/lib/api";

export async function GET(request: Request) {
  try {
    await requireAdmin();

    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.trim() || undefined;
    const role = url.searchParams.get("role") as "STUDENT" | "ADMIN" | null;
    const status = url.searchParams.get("status"); // "active" | "deleted"
    const telegram = url.searchParams.get("telegram"); // "linked" | "unlinked"
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10)));
    const skip = (page - 1) * limit;

    const where = {
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { email: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(role ? { role } : {}),
      ...(status === "deleted"
        ? { deletedAt: { not: null as null } }
        : status === "active"
          ? { deletedAt: null }
          : {}),
      ...(telegram === "linked"
        ? { telegramIdentity: { isNot: null } }
        : telegram === "unlinked"
          ? { telegramIdentity: null }
          : {}),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          emailVerified: true,
          createdAt: true,
          deletedAt: true,
          telegramIdentity: { select: { telegramUserId: true, username: true } },
          _count: { select: { programmes: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({ users, total, page, limit });
  } catch (err) {
    return jsonError(err);
  }
}

import { NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/admin-auth";
import { prisma } from "@/src/lib/prisma";
import { jsonError } from "@/src/lib/api";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.trim() || undefined; // Search by user email/name or entityId
    const action = url.searchParams.get("action");
    const entityType = url.searchParams.get("entityType");
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "50", 10)));
    const skip = (page - 1) * limit;

    const where = {
      ...(q
        ? {
            OR: [
              { user: { email: { contains: q, mode: "insensitive" as const } } },
              { user: { name: { contains: q, mode: "insensitive" as const } } },
              { entityId: { contains: q } },
            ],
          }
        : {}),
      ...(action ? { action } : {}),
      ...(entityType ? { entityType } : {}),
    };

    const [events, total] = await Promise.all([
      prisma.auditEvent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { name: true, email: true } },
        },
      }),
      prisma.auditEvent.count({ where }),
    ]);

    return NextResponse.json({ events, total, page, limit });
  } catch (err) {
    return jsonError(err);
  }
}

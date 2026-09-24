import { NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/admin-auth";
import { prisma } from "@/src/lib/prisma";
import { jsonError } from "@/src/lib/api";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.trim() || undefined;
    const status = url.searchParams.get("status") as "ACTIVE" | "COMPLETED" | "ARCHIVED" | null;
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10)));
    const skip = (page - 1) * limit;

    const where = {
      ...(q
        ? {
            OR: [
              { institution: { contains: q, mode: "insensitive" as const } },
              { department: { contains: q, mode: "insensitive" as const } },
              { user: { name: { contains: q, mode: "insensitive" as const } } },
              { user: { email: { contains: q, mode: "insensitive" as const } } },
            ],
          }
        : {}),
      ...(status ? { status } : {}),
    };

    const [programmes, total] = await Promise.all([
      prisma.siwesProgramme.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, name: true, email: true } },
          _count: { select: { entries: true, evidence: true } },
        },
      }),
      prisma.siwesProgramme.count({ where }),
    ]);

    return NextResponse.json({ programmes, total, page, limit });
  } catch (err) {
    return jsonError(err);
  }
}

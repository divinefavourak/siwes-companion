import { NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/admin-auth";
import { prisma } from "@/src/lib/prisma";
import { jsonError } from "@/src/lib/api";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.trim() || undefined;
    const status = url.searchParams.get("status");
    const kind = url.searchParams.get("kind");
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10)));
    const skip = (page - 1) * limit;

    const where = {
      ...(q ? { title: { contains: q, mode: "insensitive" as const } } : {}),
      ...(status ? { status: status as any } : {}),
      ...(kind ? { kind: kind as any } : {}),
    };

    const [evidence, total] = await Promise.all([
      prisma.evidence.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          programme: {
            select: { institution: true, user: { select: { name: true, email: true } } },
          },
        },
      }),
      prisma.evidence.count({ where }),
    ]);

    return NextResponse.json({ evidence, total, page, limit });
  } catch (err) {
    return jsonError(err);
  }
}

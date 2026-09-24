import { NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/admin-auth";
import { prisma } from "@/src/lib/prisma";
import { jsonError } from "@/src/lib/api";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.trim() || undefined; // search user email/name
    const provider = url.searchParams.get("provider");
    const purpose = url.searchParams.get("purpose");
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "50", 10)));
    const skip = (page - 1) * limit;

    const where = {
      ...(q
        ? {
            OR: [
              { user: { email: { contains: q, mode: "insensitive" as const } } },
              { user: { name: { contains: q, mode: "insensitive" as const } } },
            ],
          }
        : {}),
      ...(provider ? { provider } : {}),
      ...(purpose ? { purpose } : {}),
    };

    const [usages, total] = await Promise.all([
      prisma.llmUsage.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { name: true, email: true } },
        },
      }),
      prisma.llmUsage.count({ where }),
    ]);

    // Optional: get aggregate totals if page 1
    let aggregates = null;
    if (page === 1) {
      aggregates = await prisma.llmUsage.aggregate({
        _sum: { promptTokens: true, outputTokens: true, estimatedCost: true },
        where,
      });
    }

    return NextResponse.json({
      usages,
      total,
      page,
      limit,
      ...(aggregates && {
        aggregates: {
          promptTokens: aggregates._sum.promptTokens ?? 0,
          outputTokens: aggregates._sum.outputTokens ?? 0,
          estimatedCost: aggregates._sum.estimatedCost ? Number(aggregates._sum.estimatedCost) : 0,
        },
      }),
    });
  } catch (err) {
    return jsonError(err);
  }
}

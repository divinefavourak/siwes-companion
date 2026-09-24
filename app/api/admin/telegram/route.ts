import { NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/admin-auth";
import { prisma } from "@/src/lib/prisma";
import { jsonError } from "@/src/lib/api";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.trim() || undefined; // search by user email, username or telegramUserId
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10)));
    const skip = (page - 1) * limit;

    const where = {
      ...(q
        ? {
            OR: [
              { user: { email: { contains: q, mode: "insensitive" as const } } },
              { username: { contains: q, mode: "insensitive" as const } },
              { telegramUserId: { contains: q } },
            ],
          }
        : {}),
    };

    const [identities, total] = await Promise.all([
      prisma.telegramIdentity.findMany({
        where,
        skip,
        take: limit,
        orderBy: { linkedAt: "desc" },
        include: {
          user: { select: { id: true, name: true, email: true, botState: true } }
        },
      }),
      prisma.telegramIdentity.count({ where }),
    ]);

    // Format the response slightly to make the botState easier to consume
    const formatted = identities.map((id) => ({
      ...id,
      botState: id.user?.botState || null,
      user: { id: id.user.id, name: id.user.name, email: id.user.email },
    }));

    return NextResponse.json({ identities: formatted, total, page, limit });
  } catch (err) {
    return jsonError(err);
  }
}

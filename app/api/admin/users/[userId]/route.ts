import { NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/admin-auth";
import { prisma } from "@/src/lib/prisma";
import { jsonError } from "@/src/lib/api";

interface Params {
  params: Promise<{ userId: string }>;
}

export async function GET(_req: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { userId } = await params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        accounts: { select: { provider: true, type: true } },
        telegramIdentity: true,
        botState: { select: { state: true, updatedAt: true } },
        programmes: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            title: true,
            institution: true,
            department: true,
            durationMonths: true,
            status: true,
            startDate: true,
            endDate: true,
            _count: { select: { entries: true, evidence: true } },
          },
        },
        auditEvents: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            action: true,
            entityType: true,
            entityId: true,
            createdAt: true,
            metadata: true,
          },
        },
        _count: { select: { programmes: true, sessions: true } },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "User not found" } },
        { status: 404 }
      );
    }

    // LLM usage aggregate for this user
    const llmAggregate = await prisma.llmUsage.aggregate({
      where: { userId },
      _sum: { promptTokens: true, outputTokens: true, estimatedCost: true },
      _count: { id: true },
    });

    return NextResponse.json({
      user,
      llm: {
        promptTokens: llmAggregate._sum.promptTokens ?? 0,
        outputTokens: llmAggregate._sum.outputTokens ?? 0,
        estimatedCost: Number(llmAggregate._sum.estimatedCost ?? 0),
        requests: llmAggregate._count.id,
      },
    });
  } catch (err) {
    return jsonError(err);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const admin = await requireAdmin();
    const { userId } = await params;
    const body = await request.json();

    const allowedFields: Record<string, unknown> = {};
    if (body.role === "STUDENT" || body.role === "ADMIN") {
      allowedFields.role = body.role;
    }
    if (body.name !== undefined) allowedFields.name = String(body.name);
    if (body.restore === true) allowedFields.deletedAt = null;

    const user = await prisma.user.update({
      where: { id: userId },
      data: allowedFields,
      select: { id: true, name: true, email: true, role: true, deletedAt: true },
    });

    await prisma.auditEvent.create({
      data: {
        userId: admin.userId,
        action: "UPDATE",
        entityType: "User",
        entityId: user.id,
        metadata: allowedFields,
      }
    });

    return NextResponse.json({ user });
  } catch (err) {
    return jsonError(err);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const admin = await requireAdmin();
    const { userId } = await params;
    const url = new URL(request.url);
    const hard = url.searchParams.get("hard") === "true";

    if (hard) {
      // Hard delete — cascades all related data via Prisma relations
      await prisma.user.delete({ where: { id: userId } });
      await prisma.auditEvent.create({
        data: {
          userId: admin.userId,
          action: "HARD_DELETE",
          entityType: "User",
          entityId: userId,
          metadata: {},
        }
      });
      return NextResponse.json({ deleted: true, hard: true });
    }

    // Soft delete
    const user = await prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
      select: { id: true, deletedAt: true },
    });

    await prisma.auditEvent.create({
      data: {
        userId: admin.userId,
        action: "SOFT_DELETE",
        entityType: "User",
        entityId: user.id,
        metadata: {},
      }
    });

    return NextResponse.json({ user, hard: false });
  } catch (err) {
    return jsonError(err);
  }
}

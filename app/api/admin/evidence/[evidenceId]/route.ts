import { NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/admin-auth";
import { prisma } from "@/src/lib/prisma";
import { jsonError } from "@/src/lib/api";

interface Params {
  params: Promise<{ evidenceId: string }>;
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const admin = await requireAdmin();
    const { evidenceId } = await params;
    const body = await request.json();

    const allowedFields: Record<string, unknown> = {};
    if (body.status) allowedFields.status = body.status;
    if (body.note !== undefined) allowedFields.note = body.note;

    const evidence = await prisma.evidence.update({
      where: { id: evidenceId },
      data: allowedFields,
    });

    await prisma.auditEvent.create({
      data: {
        userId: admin.userId,
        programmeId: evidence.programmeId,
        action: "UPDATE",
        entityType: "Evidence",
        entityId: evidence.id,
        metadata: allowedFields as any,
      }
    });

    return NextResponse.json({ evidence });
  } catch (err) {
    return jsonError(err);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const admin = await requireAdmin();
    const { evidenceId } = await params;
    
    // Soft delete is preferred for evidence moderation (mark DELETED so a background job can sweep object storage)
    const evidence = await prisma.evidence.update({
      where: { id: evidenceId },
      data: { status: "DELETED" },
    });

    await prisma.auditEvent.create({
      data: {
        userId: admin.userId,
        programmeId: evidence.programmeId,
        action: "SOFT_DELETE",
        entityType: "Evidence",
        entityId: evidence.id,
        metadata: {},
      }
    });

    return NextResponse.json({ evidence, deleted: true, soft: true });
  } catch (err) {
    return jsonError(err);
  }
}

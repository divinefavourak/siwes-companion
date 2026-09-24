import { NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/admin-auth";
import { prisma } from "@/src/lib/prisma";
import { jsonError } from "@/src/lib/api";

interface Params {
  params: Promise<{ programmeId: string }>;
}

export async function GET(_req: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { programmeId } = await params;

    const programme = await prisma.siwesProgramme.findUnique({
      where: { id: programmeId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        supervisors: true,
        workingDays: true,
        _count: {
          select: { entries: true, evidence: true, jobs: true },
        },
      },
    });

    if (!programme) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Not found" } }, { status: 404 });

    return NextResponse.json({ programme });
  } catch (err) {
    return jsonError(err);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { programmeId } = await params;
    const body = await request.json();

    const allowedFields: Record<string, unknown> = {};
    if (body.status) allowedFields.status = body.status;
    if (body.title) allowedFields.title = body.title;

    const programme = await prisma.siwesProgramme.update({
      where: { id: programmeId },
      data: allowedFields,
    });

    return NextResponse.json({ programme });
  } catch (err) {
    return jsonError(err);
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { programmeId } = await params;
    await prisma.siwesProgramme.delete({ where: { id: programmeId } });
    return NextResponse.json({ deleted: true });
  } catch (err) {
    return jsonError(err);
  }
}

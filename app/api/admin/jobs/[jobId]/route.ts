import { NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/admin-auth";
import { prisma } from "@/src/lib/prisma";
import { jsonError } from "@/src/lib/api";

interface Params {
  params: Promise<{ jobId: string }>;
}

export async function GET(_req: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { jobId } = await params;
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Job not found" } }, { status: 404 });
    return NextResponse.json({ job });
  } catch (err) {
    return jsonError(err);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { jobId } = await params;
    const body = await request.json();

    const allowedFields: Record<string, unknown> = {};
    // Allow cancelling a job
    if (body.status === "CANCELLED") allowedFields.status = "CANCELLED";

    const job = await prisma.job.update({
      where: { id: jobId },
      data: allowedFields,
    });
    return NextResponse.json({ job });
  } catch (err) {
    return jsonError(err);
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { jobId } = await params;
    await prisma.job.delete({ where: { id: jobId } });
    return NextResponse.json({ deleted: true });
  } catch (err) {
    return jsonError(err);
  }
}

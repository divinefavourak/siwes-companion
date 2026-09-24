import { NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/admin-auth";
import { prisma } from "@/src/lib/prisma";
import { jsonError } from "@/src/lib/api";

interface Params {
  params: Promise<{ jobId: string }>;
}

export async function POST(_req: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { jobId } = await params;

    // To retry a job, set it back to QUEUED and clear locks
    const job = await prisma.job.update({
      where: { id: jobId },
      data: {
        status: "QUEUED",
        lockedAt: null,
        lockedBy: null,
        attempts: { increment: 1 },
      },
    });

    return NextResponse.json({ job });
  } catch (err) {
    return jsonError(err);
  }
}

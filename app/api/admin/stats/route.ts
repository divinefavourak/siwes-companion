import { NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/admin-auth";
import { prisma } from "@/src/lib/prisma";
import { jsonError } from "@/src/lib/api";

export async function GET() {
  try {
    await requireAdmin();

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const monthStart = new Date(now);
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      deletedUsers,
      totalProgrammes,
      activeProgrammes,
      completedProgrammes,
      archivedProgrammes,
      todayEntries,
      genBreakdown,
      pendingJobs,
      runningJobs,
      failedJobsLast24h,
      pendingEvidence,
      quarantinedEvidence,
      llmCost,
      telegramLinked,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { deletedAt: { not: null } } }),
      prisma.siwesProgramme.count(),
      prisma.siwesProgramme.count({ where: { status: "ACTIVE" } }),
      prisma.siwesProgramme.count({ where: { status: "COMPLETED" } }),
      prisma.siwesProgramme.count({ where: { status: "ARCHIVED" } }),
      prisma.entry.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.entry.groupBy({
        by: ["generationStatus"],
        _count: { generationStatus: true },
      }),
      prisma.job.count({ where: { status: "QUEUED" } }),
      prisma.job.count({ where: { status: "RUNNING" } }),
      prisma.job.count({ where: { status: "FAILED", updatedAt: { gte: dayAgo } } }),
      prisma.evidence.count({ where: { status: "PENDING" } }),
      prisma.evidence.count({ where: { status: "QUARANTINED" } }),
      prisma.llmUsage.aggregate({
        _sum: { estimatedCost: true },
        where: { createdAt: { gte: monthStart } },
      }),
      prisma.telegramIdentity.count(),
    ]);

    const generationBreakdown = Object.fromEntries(
      genBreakdown.map((r) => [r.generationStatus, r._count.generationStatus])
    );

    return NextResponse.json({
      users: {
        total: totalUsers,
        active: totalUsers - deletedUsers,
        deleted: deletedUsers,
      },
      programmes: {
        total: totalProgrammes,
        active: activeProgrammes,
        completed: completedProgrammes,
        archived: archivedProgrammes,
      },
      entries: {
        today: todayEntries,
        generationBreakdown,
      },
      jobs: {
        pending: pendingJobs,
        running: runningJobs,
        failedLast24h: failedJobsLast24h,
      },
      evidence: {
        pending: pendingEvidence,
        quarantined: quarantinedEvidence,
      },
      llm: {
        costThisMonth: Number(llmCost._sum.estimatedCost ?? 0),
      },
      telegram: {
        linked: telegramLinked,
      },
    });
  } catch (err) {
    return jsonError(err);
  }
}

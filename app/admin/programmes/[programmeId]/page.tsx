import { notFound } from "next/navigation";
import { requireAdmin } from "@/src/lib/admin-auth";
import { prisma } from "@/src/lib/prisma";
import { AdminBadge } from "@/src/components/admin/admin-badge";
import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import type { Route } from "next";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ programmeId: string }>;
}

export default async function AdminProgrammeDetailPage({ params }: PageProps) {
  await requireAdmin();
  const { programmeId } = await params;

  const programme = await prisma.siwesProgramme.findUnique({
    where: { id: programmeId },
    include: {
      user: true,
      supervisors: true,
      _count: {
        select: { entries: true, evidence: true, jobs: true },
      },
    },
  });

  if (!programme) notFound();

  return (
    <div className="flex flex-col gap-8 pb-12">
      <div>
        <Link
          href={"/admin/programmes" as Route}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand transition mb-6"
        >
          <ArrowLeft className="size-4" />
          Back to Programmes
        </Link>
        <div className="flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-2xl bg-sky-50 border border-sky-100">
            <BookOpen className="size-6 text-brand" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{programme.institution}</h1>
            <p className="text-sm text-slate-500">{programme.title || programme.department}</p>
          </div>
          <AdminBadge value={programme.status} />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Programme Info</h2>
          <dl className="grid grid-cols-[1fr_2fr] gap-x-4 gap-y-3 text-sm">
            <dt className="text-slate-500">Student</dt>
            <dd className="font-medium text-slate-900">{programme.user.name ?? programme.user.email}</dd>
            
            <dt className="text-slate-500">Level</dt>
            <dd className="text-slate-900">{programme.level}</dd>
            
            <dt className="text-slate-500">Duration</dt>
            <dd className="text-slate-900">{programme.durationMonths} months</dd>
            
            <dt className="text-slate-500">Organization</dt>
            <dd className="text-slate-900">{programme.organization} - {programme.unit}</dd>
            
            <dt className="text-slate-500">Timeline</dt>
            <dd className="text-slate-900">
              {new Date(programme.startDate).toLocaleDateString()} → {new Date(programme.endDate).toLocaleDateString()}
            </dd>
          </dl>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Statistics</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
              <p className="text-xs font-medium text-slate-500">Logbook Entries</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{programme._count.entries}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
              <p className="text-xs font-medium text-slate-500">Evidence Uploads</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{programme._count.evidence}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
              <p className="text-xs font-medium text-slate-500">Background Jobs</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{programme._count.jobs}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
              <p className="text-xs font-medium text-slate-500">Supervisors</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{programme.supervisors.length}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

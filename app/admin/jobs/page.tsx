import { Suspense } from "react";
import { Cpu } from "lucide-react";
import { requireAdmin } from "@/src/lib/admin-auth";
import { JobsTable } from "@/src/components/admin/jobs-table";

export const dynamic = "force-dynamic";
export const metadata = { title: "Jobs — Admin" };

export default async function AdminJobsPage() {
  await requireAdmin();
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-slate-50 border border-slate-200">
          <Cpu className="size-5 text-slate-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Background Jobs</h1>
          <p className="text-sm text-slate-500">Monitor and retry asynchronous background tasks.</p>
        </div>
      </div>
      <Suspense fallback={<div className="text-sm text-slate-400">Loading…</div>}>
        <JobsTable />
      </Suspense>
    </div>
  );
}


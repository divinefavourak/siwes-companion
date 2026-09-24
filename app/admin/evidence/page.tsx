import { Suspense } from "react";
import { FolderSearch } from "lucide-react";
import { requireAdmin } from "@/src/lib/admin-auth";
import { EvidenceTable } from "@/src/components/admin/evidence-table";

export const dynamic = "force-dynamic";
export const metadata = { title: "Evidence — Admin" };

export default async function AdminEvidencePage() {
  await requireAdmin();
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-orange-50 border border-orange-100">
          <FolderSearch className="size-5 text-orange-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Evidence Moderation</h1>
          <p className="text-sm text-slate-500">Review and moderate uploaded files and URLs.</p>
        </div>
      </div>
      <Suspense fallback={<div className="text-sm text-slate-400">Loading…</div>}>
        <EvidenceTable />
      </Suspense>
    </div>
  );
}


import { Suspense } from "react";
import { ClipboardList } from "lucide-react";
import { requireAdmin } from "@/src/lib/admin-auth";
import { AuditTable } from "@/src/components/admin/audit-table";

export const dynamic = "force-dynamic";
export const metadata = { title: "Audit Log — Admin" };

export default async function AdminAuditPage() {
  await requireAdmin();
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-slate-50 border border-slate-200">
          <ClipboardList className="size-5 text-slate-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Audit Log</h1>
          <p className="text-sm text-slate-500">Immutable record of all system and user actions.</p>
        </div>
      </div>
      <Suspense fallback={<div className="text-sm text-slate-400">Loading…</div>}>
        <AuditTable />
      </Suspense>
    </div>
  );
}


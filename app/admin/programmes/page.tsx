import { Suspense } from "react";
import { BookOpen } from "lucide-react";
import { requireAdmin } from "@/src/lib/admin-auth";
import { ProgrammesTable } from "@/src/components/admin/programmes-table";

export const dynamic = "force-dynamic";
export const metadata = { title: "Programmes — Admin" };

export default async function AdminProgrammesPage() {
  await requireAdmin();
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-sky-50 border border-sky-100">
          <BookOpen className="size-5 text-brand" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Programmes</h1>
          <p className="text-sm text-slate-500">Search and manage user SIWES programmes.</p>
        </div>
      </div>
      <Suspense fallback={<div className="text-sm text-slate-400">Loading…</div>}>
        <ProgrammesTable />
      </Suspense>
    </div>
  );
}


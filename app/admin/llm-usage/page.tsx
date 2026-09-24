import { Suspense } from "react";
import { BarChart3 } from "lucide-react";
import { requireAdmin } from "@/src/lib/admin-auth";
import { LlmUsageTable } from "@/src/components/admin/llm-usage-table";

export const dynamic = "force-dynamic";
export const metadata = { title: "LLM Usage — Admin" };

export default async function AdminLlmUsagePage() {
  await requireAdmin();
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-orange-50 border border-orange-100">
          <BarChart3 className="size-5 text-orange-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">LLM Usage & Cost</h1>
          <p className="text-sm text-slate-500">Track API requests, token consumption, and estimated costs.</p>
        </div>
      </div>
      <Suspense fallback={<div className="text-sm text-slate-400">Loading…</div>}>
        <LlmUsageTable />
      </Suspense>
    </div>
  );
}


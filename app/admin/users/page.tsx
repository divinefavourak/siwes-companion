import { Suspense } from "react";
import { Users } from "lucide-react";
import { requireAdmin } from "@/src/lib/admin-auth";
import { UsersTable } from "@/src/components/admin/users-table";

export const dynamic = "force-dynamic";
export const metadata = { title: "Users — Admin" };

export default async function AdminUsersPage() {
  await requireAdmin();

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-sky-50 border border-sky-100">
          <Users className="size-5 text-brand" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Users</h1>
          <p className="text-sm text-slate-500">Search, filter, and manage all registered users.</p>
        </div>
      </div>

      <Suspense fallback={<div className="text-sm text-slate-400">Loading…</div>}>
        <UsersTable />
      </Suspense>
    </div>
  );
}

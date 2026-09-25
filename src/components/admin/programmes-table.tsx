"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import { Search } from "lucide-react";
import { AdminDataTable, type Column } from "@/src/components/admin/admin-data-table";
import { AdminBadge } from "@/src/components/admin/admin-badge";
import { AdminConfirmDialog } from "@/src/components/admin/admin-confirm-dialog";

interface AdminProgramme {
  id: string;
  user: { id: string; name: string | null; email: string | null };
  institution: string;
  department: string;
  durationMonths: number;
  status: "ACTIVE" | "COMPLETED" | "ARCHIVED";
  startDate: string;
  endDate: string;
  _count: { entries: number; evidence: number };
}

interface FetchResult {
  programmes: AdminProgramme[];
  total: number;
  page: number;
}

const PAGE_SIZE = 20;

export function ProgrammesTable() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState<FetchResult>({ programmes: [], total: 0, page: 1 });
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [status, setStatus] = useState(searchParams.get("status") ?? "");
  const [page, setPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState<AdminProgramme | null>(null);

  const fetchProgrammes = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
      ...(q ? { q } : {}),
      ...(status ? { status } : {}),
    });
    const res = await fetch(`/api/admin/programmes?${params}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [q, status, page]);

  useEffect(() => {
    const timer = setTimeout(fetchProgrammes, 300);
    return () => clearTimeout(timer);
  }, [fetchProgrammes]);

  async function handleDelete() {
    if (!confirmDelete) return;
    await fetch(`/api/admin/programmes/${confirmDelete.id}`, { method: "DELETE" });
    setConfirmDelete(null);
    fetchProgrammes();
  }

  const columns: Column<AdminProgramme>[] = [
    {
      key: "user",
      header: "User",
      render: (p) => (
        <div>
          <p className="font-semibold text-slate-900">{p.user.name ?? "—"}</p>
          <p className="text-xs text-slate-400">{p.user.email ?? "—"}</p>
        </div>
      ),
    },
    {
      key: "institution",
      header: "Institution",
      render: (p) => (
        <div>
          <p className="font-semibold text-slate-900">{p.institution}</p>
          <p className="text-xs text-slate-400">{p.department}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (p) => <AdminBadge value={p.status} />,
    },
    {
      key: "duration",
      header: "Duration",
      render: (p) => <span className="text-sm text-slate-600">{p.durationMonths} months</span>,
    },
    {
      key: "counts",
      header: "Data",
      render: (p) => (
        <div className="text-xs text-slate-500 flex flex-col gap-0.5">
          <span>{p._count.entries} entries</span>
          <span>{p._count.evidence} files</span>
        </div>
      ),
    },
    {
      key: "dates",
      header: "Timeline",
      render: (p) => (
        <div className="text-xs text-slate-500">
          <p>{new Date(p.startDate).toLocaleDateString()}</p>
          <p>to {new Date(p.endDate).toLocaleDateString()}</p>
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (p) => (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setConfirmDelete(p); }}
          className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-500 hover:bg-red-50 transition"
        >
          Delete
        </button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder="Search institution or user…"
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-sky-100 transition"
          />
        </div>

        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-brand focus:ring-2 focus:ring-sky-100 transition"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="COMPLETED">Completed</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>

      {!loading && <p className="text-xs text-slate-500">{data.total} programmes found</p>}

      <AdminDataTable
        columns={columns}
        data={data.programmes}
        total={data.total}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        keyExtractor={(p) => p.id}
        emptyMessage={loading ? "Loading…" : "No programmes found."}
        onRowClick={(p) => router.push(`/admin/programmes/${p.id}` as Route)}
      />

      {confirmDelete && (
        <AdminConfirmDialog
          title="Delete Programme"
          description={`This will hard-delete ${confirmDelete.institution} for ${confirmDelete.user.email} and all its entries, evidence, and jobs.`}
          confirmLabel="Delete"
          requireTyping={confirmDelete.institution}
          danger={true}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

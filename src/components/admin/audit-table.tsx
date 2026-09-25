"use client";

import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { AdminDataTable, type Column } from "@/src/components/admin/admin-data-table";

interface AdminAuditEvent {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  metadata: Record<string, unknown> | null;
  user: { name: string | null; email: string | null } | null;
}

interface FetchResult {
  events: AdminAuditEvent[];
  total: number;
  page: number;
}

const PAGE_SIZE = 50;

export function AuditTable() {
  const [data, setData] = useState<FetchResult>({ events: [], total: 0, page: 1 });
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const fetchAudit = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
      ...(q ? { q } : {}),
    });
    const res = await fetch(`/api/admin/audit?${params}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [q, page]);

  useEffect(() => {
    const timer = setTimeout(fetchAudit, 300);
    return () => clearTimeout(timer);
  }, [fetchAudit]);

  const columns: Column<AdminAuditEvent>[] = [
    {
      key: "createdAt",
      header: "Timestamp",
      render: (a) => (
        <span className="text-xs text-slate-500 whitespace-nowrap">
          {new Date(a.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      key: "user",
      header: "User",
      render: (a) => (
        <div>
          {a.user ? (
            <>
              <p className="font-medium text-slate-900">{a.user.name ?? "—"}</p>
              <p className="text-xs text-slate-400">{a.user.email ?? "—"}</p>
            </>
          ) : (
            <span className="text-xs text-slate-400">System</span>
          )}
        </div>
      ),
    },
    {
      key: "action",
      header: "Action",
      render: (a) => <span className="font-mono text-xs font-semibold text-slate-800">{a.action}</span>,
    },
    {
      key: "entity",
      header: "Entity",
      render: (a) => (
        <div>
          <p className="text-xs font-semibold text-slate-700">{a.entityType}</p>
          <p className="font-mono text-[10px] text-slate-400 max-w-[150px] truncate">{a.entityId}</p>
        </div>
      ),
    },
    {
      key: "metadata",
      header: "Metadata",
      render: (a) => (
        <pre className="text-[10px] text-slate-500 max-w-[300px] overflow-auto whitespace-pre-wrap">
          {a.metadata ? JSON.stringify(a.metadata, null, 2) : "—"}
        </pre>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder="Search by user or entity ID…"
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2.5 text-sm outline-none focus:border-brand"
          />
        </div>
      </div>

      {!loading && <p className="text-xs text-slate-500">{data.total} audit events found</p>}

      <AdminDataTable
        columns={columns}
        data={data.events}
        total={data.total}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        keyExtractor={(a) => a.id}
        emptyMessage={loading ? "Loading…" : "No audit events found."}
      />
    </div>
  );
}

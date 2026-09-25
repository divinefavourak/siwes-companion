"use client";

import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { AdminDataTable, type Column } from "@/src/components/admin/admin-data-table";
import { AdminBadge } from "@/src/components/admin/admin-badge";

interface AdminEvidence {
  id: string;
  title: string;
  kind: "FILE" | "URL" | "NOTE";
  status: "PENDING" | "AVAILABLE" | "QUARANTINED" | "REJECTED" | "DELETED";
  mimeType: string | null;
  byteSize: number | null;
  createdAt: string;
  programme: { institution: string; user: { name: string | null; email: string | null } };
}

interface FetchResult {
  evidence: AdminEvidence[];
  total: number;
  page: number;
}

const PAGE_SIZE = 20;

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function EvidenceTable() {
  const [data, setData] = useState<FetchResult>({ evidence: [], total: 0, page: 1 });
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [kind, setKind] = useState("");
  const [page, setPage] = useState(1);

  const fetchEvidence = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
      ...(q ? { q } : {}),
      ...(status ? { status } : {}),
      ...(kind ? { kind } : {}),
    });
    const res = await fetch(`/api/admin/evidence?${params}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [q, status, kind, page]);

  useEffect(() => {
    const timer = setTimeout(fetchEvidence, 300);
    return () => clearTimeout(timer);
  }, [fetchEvidence]);

  async function handleStatus(id: string, newStatus: string) {
    await fetch(`/api/admin/evidence/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchEvidence();
  }

  const columns: Column<AdminEvidence>[] = [
    {
      key: "title",
      header: "Title",
      render: (e) => (
        <div>
          <p className="font-semibold text-slate-900 truncate max-w-[200px]">{e.title}</p>
          <div className="flex gap-2 items-center mt-1 text-xs">
            <span className="font-mono text-slate-400 bg-slate-50 px-1 rounded">{e.kind}</span>
            {e.byteSize ? <span className="text-slate-500">{formatBytes(e.byteSize)}</span> : null}
          </div>
        </div>
      ),
    },
    {
      key: "user",
      header: "Owner",
      render: (e) => (
        <div>
          <p className="font-medium text-slate-900">{e.programme.user.name ?? "—"}</p>
          <p className="text-xs text-slate-400 truncate max-w-[150px]">{e.programme.user.email ?? "—"}</p>
        </div>
      ),
    },
    {
      key: "programme",
      header: "Programme",
      render: (e) => <span className="text-xs text-slate-600">{e.programme.institution}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (e) => <AdminBadge value={e.status} />,
    },
    {
      key: "createdAt",
      header: "Date",
      render: (e) => (
        <span className="text-xs text-slate-500">
          {new Date(e.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (e) => (
        <div className="flex gap-1.5 flex-wrap">
          <button onClick={() => handleStatus(e.id, "AVAILABLE")} className="px-2 py-1 text-xs border rounded-lg text-emerald-600 border-emerald-200 hover:bg-emerald-50">Approve</button>
          <button onClick={() => handleStatus(e.id, "QUARANTINED")} className="px-2 py-1 text-xs border rounded-lg text-orange-600 border-orange-200 hover:bg-orange-50">Quarantine</button>
          <button onClick={() => handleStatus(e.id, "REJECTED")} className="px-2 py-1 text-xs border rounded-lg text-red-600 border-red-200 hover:bg-red-50">Reject</button>
        </div>
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
            placeholder="Search by title…"
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2.5 text-sm outline-none focus:border-brand"
          />
        </div>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="QUARANTINED">Quarantined</option>
          <option value="AVAILABLE">Available</option>
          <option value="REJECTED">Rejected</option>
          <option value="DELETED">Deleted</option>
        </select>
        <select value={kind} onChange={(e) => { setKind(e.target.value); setPage(1); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
          <option value="">All Kinds</option>
          <option value="FILE">Files</option>
          <option value="URL">URLs</option>
          <option value="NOTE">Notes</option>
        </select>
      </div>
      
      {!loading && <p className="text-xs text-slate-500">{data.total} items found</p>}

      <AdminDataTable
        columns={columns}
        data={data.evidence}
        total={data.total}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        keyExtractor={(e) => e.id}
        emptyMessage={loading ? "Loading…" : "No evidence items found."}
      />
    </div>
  );
}

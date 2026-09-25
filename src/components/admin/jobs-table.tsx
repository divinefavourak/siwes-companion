"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminDataTable, type Column } from "@/src/components/admin/admin-data-table";
import { AdminBadge } from "@/src/components/admin/admin-badge";

interface AdminJob {
  id: string;
  type: string;
  status: "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
  attempts: number;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

interface FetchResult {
  jobs: AdminJob[];
  total: number;
  page: number;
}

const PAGE_SIZE = 20;

export function JobsTable() {
  const [data, setData] = useState<FetchResult>({ jobs: [], total: 0, page: 1 });
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
      ...(status ? { status } : {}),
      ...(type ? { type } : {}),
    });
    const res = await fetch(`/api/admin/jobs?${params}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [status, type, page]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  async function handleRetry(jobId: string) {
    await fetch(`/api/admin/jobs/${jobId}/retry`, { method: "POST" });
    fetchJobs();
  }

  async function handleCancel(jobId: string) {
    await fetch(`/api/admin/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CANCELLED" }),
    });
    fetchJobs();
  }

  const columns: Column<AdminJob>[] = [
    {
      key: "type",
      header: "Type",
      render: (j) => <span className="font-mono text-xs font-semibold text-slate-800">{j.type}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (j) => <AdminBadge value={j.status} />,
    },
    {
      key: "attempts",
      header: "Attempts",
      render: (j) => <span className="text-sm text-slate-600">{j.attempts}</span>,
    },
    {
      key: "lastError",
      header: "Last Error",
      render: (j) =>
        j.lastError ? (
          <p className="text-xs text-red-600 truncate max-w-[250px]" title={j.lastError}>
            {j.lastError}
          </p>
        ) : (
          <span className="text-slate-300">—</span>
        ),
    },
    {
      key: "dates",
      header: "Timeline",
      render: (j) => (
        <div className="text-xs text-slate-500">
          <p>Created: {new Date(j.createdAt).toLocaleDateString()}</p>
          <p>Updated: {new Date(j.updatedAt).toLocaleDateString()}</p>
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (j) => (
        <div className="flex gap-2">
          {["FAILED", "CANCELLED"].includes(j.status) && (
            <button onClick={() => handleRetry(j.id)} className="px-2 py-1 text-xs border rounded-lg text-blue-600 border-blue-200 hover:bg-blue-50">Retry</button>
          )}
          {["QUEUED", "RUNNING"].includes(j.status) && (
            <button onClick={() => handleCancel(j.id)} className="px-2 py-1 text-xs border rounded-lg text-slate-600 border-slate-200 hover:bg-slate-50">Cancel</button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-3">
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
          <option value="">All Statuses</option>
          <option value="QUEUED">Queued</option>
          <option value="RUNNING">Running</option>
          <option value="SUCCEEDED">Succeeded</option>
          <option value="FAILED">Failed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        
        {/* We can fetch unique types from API, or just provide a text input. Text input for simplicity. */}
        <input
          type="text"
          value={type}
          onChange={(e) => { setType(e.target.value); setPage(1); }}
          placeholder="Filter by JobType..."
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
        />
      </div>

      {!loading && <p className="text-xs text-slate-500">{data.total} jobs found</p>}

      <AdminDataTable
        columns={columns}
        data={data.jobs}
        total={data.total}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        keyExtractor={(j) => j.id}
        emptyMessage={loading ? "Loading…" : "No jobs found."}
      />
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { AdminDataTable, type Column } from "@/src/components/admin/admin-data-table";
import { AdminStatCard } from "@/src/components/admin/admin-stat-card";
import { BarChart3 } from "lucide-react";

interface AdminLlmUsage {
  id: string;
  provider: string;
  model: string;
  purpose: string;
  promptTokens: number;
  outputTokens: number;
  estimatedCost: string | number | null; // Prisma Decimal comes as string usually
  createdAt: string;
  user: { name: string | null; email: string | null } | null;
}

interface FetchResult {
  usages: AdminLlmUsage[];
  total: number;
  page: number;
  aggregates?: {
    promptTokens: number;
    outputTokens: number;
    estimatedCost: number;
  };
}

const PAGE_SIZE = 50;

export function LlmUsageTable() {
  const [data, setData] = useState<FetchResult>({ usages: [], total: 0, page: 1 });
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [provider, setProvider] = useState("");
  const [purpose, setPurpose] = useState("");
  const [page, setPage] = useState(1);

  const fetchUsage = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
      ...(q ? { q } : {}),
      ...(provider ? { provider } : {}),
      ...(purpose ? { purpose } : {}),
    });
    const res = await fetch(`/api/admin/llm-usage?${params}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [q, provider, purpose, page]);

  useEffect(() => {
    const timer = setTimeout(fetchUsage, 300);
    return () => clearTimeout(timer);
  }, [fetchUsage]);

  const columns: Column<AdminLlmUsage>[] = [
    {
      key: "createdAt",
      header: "Date",
      render: (u) => (
        <span className="text-xs text-slate-500 whitespace-nowrap">
          {new Date(u.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      key: "user",
      header: "User",
      render: (u) => (
        <div>
          {u.user ? (
            <>
              <p className="font-medium text-slate-900">{u.user.name ?? "—"}</p>
              <p className="text-xs text-slate-400">{u.user.email ?? "—"}</p>
            </>
          ) : (
            <span className="text-xs text-slate-400">System</span>
          )}
        </div>
      ),
    },
    {
      key: "model",
      header: "Model",
      render: (u) => (
        <div>
          <p className="font-semibold text-slate-900 text-xs">{u.model}</p>
          <p className="text-[10px] text-slate-400 font-mono">{u.provider}</p>
        </div>
      ),
    },
    {
      key: "purpose",
      header: "Purpose",
      render: (u) => <span className="font-mono text-[10px] bg-slate-50 px-1.5 py-0.5 rounded text-slate-600">{u.purpose}</span>,
    },
    {
      key: "tokens",
      header: "Tokens (P / O)",
      render: (u) => (
        <div className="text-xs font-mono text-slate-500">
          <span className="text-blue-600">{u.promptTokens}</span> / <span className="text-emerald-600">{u.outputTokens}</span>
        </div>
      ),
    },
    {
      key: "cost",
      header: "Cost",
      render: (u) => (
        <span className="text-xs font-mono font-semibold text-slate-800">
          ${Number(u.estimatedCost ?? 0).toFixed(6)}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Overview Cards (only when viewing first page/all data) */}
      {data.aggregates && (
        <div className="grid gap-4 sm:grid-cols-3">
          <AdminStatCard
            title="Total Tokens"
            value={(data.aggregates.promptTokens + data.aggregates.outputTokens).toLocaleString()}
            icon={<BarChart3 />}
            accent="blue"
            description={`${data.aggregates.promptTokens.toLocaleString()} prompt / ${data.aggregates.outputTokens.toLocaleString()} output`}
          />
          <AdminStatCard
            title="Total Cost"
            value={`$${data.aggregates.estimatedCost.toFixed(4)}`}
            icon={<BarChart3 />}
            accent="orange"
          />
          <AdminStatCard
            title="Requests"
            value={data.total.toLocaleString()}
            icon={<BarChart3 />}
            accent="slate"
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder="Search by user email…"
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2.5 text-sm outline-none focus:border-brand"
          />
        </div>
        <input
          type="text"
          value={provider}
          onChange={(e) => { setProvider(e.target.value); setPage(1); }}
          placeholder="Filter provider (e.g. groq)"
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
        />
        <input
          type="text"
          value={purpose}
          onChange={(e) => { setPurpose(e.target.value); setPage(1); }}
          placeholder="Filter purpose..."
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
        />
      </div>

      <AdminDataTable
        columns={columns}
        data={data.usages}
        total={data.total}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        keyExtractor={(u) => u.id}
        emptyMessage={loading ? "Loading…" : "No usage records found."}
      />
    </div>
  );
}

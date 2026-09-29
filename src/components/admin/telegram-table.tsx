"use client";

import { useCallback, useEffect, useState } from "react";
import { Mail, Search } from "lucide-react";
import { AdminDataTable, type Column } from "@/src/components/admin/admin-data-table";
import { AdminConfirmDialog } from "@/src/components/admin/admin-confirm-dialog";

interface AdminTelegramIdentity {
  id: string;
  telegramUserId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  linkedAt: string;
  lastSeenAt: string | null;
  user: { id: string; name: string | null; email: string | null };
  botState: { state: string; updatedAt: string } | null;
}

interface FetchResult {
  identities: AdminTelegramIdentity[];
  total: number;
  page: number;
}

const PAGE_SIZE = 20;

export function TelegramTable() {
  const [data, setData] = useState<FetchResult>({ identities: [], total: 0, page: 1 });
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [confirmUnlink, setConfirmUnlink] = useState<AdminTelegramIdentity | null>(null);
  const [missingEmailCount, setMissingEmailCount] = useState<number | null>(null);
  const [confirmEmailRequest, setConfirmEmailRequest] = useState(false);
  const [emailRequestResult, setEmailRequestResult] = useState<string | null>(null);
  const [countError, setCountError] = useState(false);

  const fetchMissingEmailCount = useCallback(async () => {
    setCountError(false);
    try {
      const res = await fetch("/api/admin/telegram/request-emails");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setMissingEmailCount((await res.json()).count);
    } catch {
      setCountError(true);
    }
  }, []);

  useEffect(() => {
    fetchMissingEmailCount();
  }, [fetchMissingEmailCount]);

  async function handleEmailRequest() {
    setConfirmEmailRequest(false);
    setEmailRequestResult("Sending…");
    try {
      const res = await fetch("/api/admin/telegram/request-emails", { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setEmailRequestResult(
        `Asked ${json.sent} of ${json.total} students for their email${json.failed ? ` (${json.failed} couldn't be reached)` : ""}.`
      );
    } catch {
      // Messages may have gone out before the failure, so don't claim nothing was sent.
      setEmailRequestResult("The request failed or timed out. Some students may already have been messaged — check the audit log before retrying.");
    }
    fetchMissingEmailCount();
  }

  const fetchTelegram = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
      ...(q ? { q } : {}),
    });
    const res = await fetch(`/api/admin/telegram?${params}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [q, page]);

  useEffect(() => {
    const timer = setTimeout(fetchTelegram, 300);
    return () => clearTimeout(timer);
  }, [fetchTelegram]);

  async function handleUnlink() {
    if (!confirmUnlink) return;
    await fetch(`/api/admin/telegram/${confirmUnlink.user.id}`, { method: "DELETE" });
    setConfirmUnlink(null);
    fetchTelegram();
  }

  const columns: Column<AdminTelegramIdentity>[] = [
    {
      key: "user",
      header: "User",
      render: (t) => (
        <div>
          <p className="font-medium text-slate-900">{t.user.name ?? "—"}</p>
          <p className="text-xs text-slate-400">{t.user.email ?? "—"}</p>
        </div>
      ),
    },
    {
      key: "telegram",
      header: "Telegram Account",
      render: (t) => (
        <div>
          <p className="font-semibold text-slate-900 text-sm">
            {t.firstName} {t.lastName}
          </p>
          <div className="flex gap-2 items-center text-xs mt-0.5">
            <span className="text-blue-600">@{t.username ?? "—"}</span>
            <span className="font-mono text-slate-400">{t.telegramUserId}</span>
          </div>
        </div>
      ),
    },
    {
      key: "botState",
      header: "Bot State",
      render: (t) => (
        <span className="font-mono text-[10px] bg-slate-50 px-1.5 py-0.5 rounded text-slate-600">
          {t.botState?.state ?? "—"}
        </span>
      ),
    },
    {
      key: "dates",
      header: "Timeline",
      render: (t) => (
        <div className="text-xs text-slate-500 flex flex-col gap-0.5">
          <span>Linked: {new Date(t.linkedAt).toLocaleDateString()}</span>
          <span>Seen: {t.lastSeenAt ? new Date(t.lastSeenAt).toLocaleDateString() : "—"}</span>
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (t) => (
        <button
          type="button"
          onClick={() => setConfirmUnlink(t)}
          className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-500 hover:bg-red-50 transition"
        >
          Unlink
        </button>
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
            placeholder="Search by user or telegram ID…"
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2.5 text-sm outline-none focus:border-brand"
          />
        </div>
        <button
          type="button"
          disabled={!missingEmailCount}
          onClick={() => setConfirmEmailRequest(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Mail className="size-4" />
          Ask for emails{missingEmailCount !== null ? ` (${missingEmailCount})` : ""}
        </button>
      </div>

      {countError && (
        <p className="text-xs text-red-600">
          Couldn&apos;t load how many students have no email.{" "}
          <button type="button" onClick={fetchMissingEmailCount} className="font-semibold underline">
            Retry
          </button>
        </p>
      )}
      {emailRequestResult && <p className="text-xs text-slate-600">{emailRequestResult}</p>}

      {!loading && <p className="text-xs text-slate-500">{data.total} linked accounts found</p>}

      <AdminDataTable
        columns={columns}
        data={data.identities}
        total={data.total}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        keyExtractor={(t) => t.id}
        emptyMessage={loading ? "Loading…" : "No telegram links found."}
      />

      {confirmEmailRequest && (
        <AdminConfirmDialog
          title="Ask students for their email"
          description={`This sends an "Add your email" message in Telegram to ${missingEmailCount} student(s) whose account has no email. Each student gets it once per click, so avoid repeating it.`}
          confirmLabel="Send"
          danger={false}
          onConfirm={handleEmailRequest}
          onCancel={() => setConfirmEmailRequest(false)}
        />
      )}

      {confirmUnlink && (
        <AdminConfirmDialog
          title="Force Unlink Telegram"
          description={`This will immediately disconnect ${confirmUnlink.user.email} from Telegram and delete their bot state.`}
          confirmLabel="Unlink"
          danger={true}
          onConfirm={handleUnlink}
          onCancel={() => setConfirmUnlink(null)}
        />
      )}
    </div>
  );
}

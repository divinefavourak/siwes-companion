"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import { Search, UserCheck, UserX } from "lucide-react";
import { AdminDataTable, type Column } from "@/src/components/admin/admin-data-table";
import { AdminBadge } from "@/src/components/admin/admin-badge";
import { AdminConfirmDialog } from "@/src/components/admin/admin-confirm-dialog";

interface AdminUser {
  id: string;
  name: string | null;
  email: string | null;
  role: "STUDENT" | "ADMIN";
  emailVerified: string | null;
  createdAt: string;
  deletedAt: string | null;
  telegramIdentity: { telegramUserId: string; username: string | null } | null;
  _count: { programmes: number };
}

interface FetchResult {
  users: AdminUser[];
  total: number;
  page: number;
}

const PAGE_SIZE = 20;

export function UsersTable() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState<FetchResult>({ users: [], total: 0, page: 1 });
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [role, setRole] = useState(searchParams.get("role") ?? "");
  const [status, setStatus] = useState(searchParams.get("status") ?? "active");
  const [page, setPage] = useState(1);
  const [confirmAction, setConfirmAction] = useState<{
    type: "soft-delete" | "restore" | "toggle-role";
    user: AdminUser;
  } | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
      ...(q ? { q } : {}),
      ...(role ? { role } : {}),
      ...(status ? { status } : {}),
    });
    const res = await fetch(`/api/admin/users?${params}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [q, role, status, page]);

  useEffect(() => {
    const timer = setTimeout(fetchUsers, 300);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  async function handleAction(action: typeof confirmAction) {
    if (!action) return;
    const { type, user } = action;

    if (type === "soft-delete") {
      await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
    } else if (type === "restore") {
      await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restore: true }),
      });
    } else if (type === "toggle-role") {
      await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: user.role === "ADMIN" ? "STUDENT" : "ADMIN" }),
      });
    }

    setConfirmAction(null);
    fetchUsers();
  }

  const columns: Column<AdminUser>[] = [
    {
      key: "name",
      header: "User",
      render: (u) => (
        <div>
          <p className="font-semibold text-slate-900">{u.name ?? "—"}</p>
          <p className="text-xs text-slate-400">{u.email ?? "—"}</p>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (u) => <AdminBadge value={u.role} />,
    },
    {
      key: "emailVerified",
      header: "Verified",
      render: (u) =>
        u.emailVerified ? (
          <UserCheck className="size-4 text-emerald-500" />
        ) : (
          <UserX className="size-4 text-slate-300" />
        ),
    },
    {
      key: "programmes",
      header: "Programmes",
      render: (u) => (
        <span className="font-mono text-slate-600">{u._count.programmes}</span>
      ),
    },
    {
      key: "telegram",
      header: "Telegram",
      render: (u) =>
        u.telegramIdentity ? (
          <span className="text-xs text-slate-500">
            @{u.telegramIdentity.username ?? u.telegramIdentity.telegramUserId}
          </span>
        ) : (
          <span className="text-xs text-slate-300">—</span>
        ),
    },
    {
      key: "createdAt",
      header: "Joined",
      render: (u) => (
        <span className="text-xs text-slate-500">
          {new Date(u.createdAt).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (u) =>
        u.deletedAt ? (
          <AdminBadge value="DELETED" />
        ) : (
          <AdminBadge value="ACTIVE" />
        ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (u) => (
        <div className="flex items-center gap-2">
          {u.deletedAt ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setConfirmAction({ type: "restore", user: u }); }}
              className="rounded-lg border border-emerald-200 px-2.5 py-1 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 transition"
            >
              Restore
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setConfirmAction({ type: "soft-delete", user: u }); }}
              className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-500 hover:bg-red-50 transition"
            >
              Delete
            </button>
          )}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setConfirmAction({ type: "toggle-role", user: u }); }}
            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
          >
            {u.role === "ADMIN" ? "Demote" : "Make Admin"}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder="Search by name or email…"
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-sky-100 transition"
          />
        </div>

        <select
          value={role}
          onChange={(e) => { setRole(e.target.value); setPage(1); }}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-brand focus:ring-2 focus:ring-sky-100 transition"
        >
          <option value="">All Roles</option>
          <option value="STUDENT">Student</option>
          <option value="ADMIN">Admin</option>
        </select>

        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-brand focus:ring-2 focus:ring-sky-100 transition"
        >
          <option value="active">Active Users</option>
          <option value="deleted">Deleted Users</option>
          <option value="">All Users</option>
        </select>
      </div>

      {/* Results count */}
      {!loading && (
        <p className="text-xs text-slate-500">
          {data.total} user{data.total !== 1 ? "s" : ""} found
        </p>
      )}

      {/* Table */}
      <AdminDataTable
        columns={columns}
        data={data.users}
        total={data.total}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        keyExtractor={(u) => u.id}
        emptyMessage={loading ? "Loading…" : "No users found."}
        onRowClick={(u) => router.push(`/admin/users/${u.id}` as Route)}
      />

      {/* Confirm dialogs */}
      {confirmAction && (
        <AdminConfirmDialog
          title={
            confirmAction.type === "soft-delete"
              ? "Delete User"
              : confirmAction.type === "restore"
                ? "Restore User"
                : confirmAction.user.role === "ADMIN"
                  ? "Demote to Student"
                  : "Promote to Admin"
          }
          description={
            confirmAction.type === "soft-delete"
              ? `This will soft-delete ${confirmAction.user.email}. Their data is preserved and can be restored.`
              : confirmAction.type === "restore"
                ? `This will restore ${confirmAction.user.email} and make them active again.`
                : confirmAction.user.role === "ADMIN"
                  ? `${confirmAction.user.email} will lose admin access and become a regular student.`
                  : `${confirmAction.user.email} will gain full admin access to this panel.`
          }
          confirmLabel={
            confirmAction.type === "soft-delete"
              ? "Delete"
              : confirmAction.type === "restore"
                ? "Restore"
                : confirmAction.user.role === "ADMIN"
                  ? "Demote"
                  : "Promote"
          }
          danger={confirmAction.type === "soft-delete" || confirmAction.type === "toggle-role"}
          onConfirm={() => handleAction(confirmAction)}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}

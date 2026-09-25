import { notFound } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock,
  DollarSign,
  Mail,
  MessageCircle,
  XCircle,
} from "lucide-react";
import { requireAdmin } from "@/src/lib/admin-auth";
import { prisma } from "@/src/lib/prisma";
import { AdminBadge } from "@/src/components/admin/admin-badge";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ userId: string }>;
}

export default async function AdminUserDetailPage({ params }: Params) {
  await requireAdmin();
  const { userId } = await params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      accounts: { select: { provider: true } },
      telegramIdentity: true,
      botState: { select: { state: true, updatedAt: true } },
      programmes: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          institution: true,
          department: true,
          organization: true,
          unit: true,
          durationMonths: true,
          status: true,
          startDate: true,
          endDate: true,
          _count: { select: { entries: true, evidence: true } },
        },
      },
      auditEvents: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          createdAt: true,
        },
      },
    },
  });

  if (!user) notFound();

  const llm = await prisma.llmUsage.aggregate({
    where: { userId },
    _sum: { promptTokens: true, outputTokens: true, estimatedCost: true },
    _count: { id: true },
  });

  const formatDate = (d: Date | string | null) =>
    d
      ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
      : "—";

  return (
    <div className="flex flex-col gap-8 max-w-5xl">
      {/* Back */}
      <Link
        href={"/admin/users" as Route}
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition"
      >
        <ArrowLeft className="size-4" />
        All Users
      </Link>

      {/* Identity Panel */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-soft flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{user.name ?? "Unnamed User"}</h1>
            <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
              <Mail className="size-3.5" />
              {user.email ?? "No email"}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <AdminBadge value={user.role} />
            {user.deletedAt && <AdminBadge value="DELETED" />}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 text-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Joined</p>
            <p className="text-slate-700">{formatDate(user.createdAt)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Email Verified</p>
            <p className="flex items-center gap-1.5 text-slate-700">
              {user.emailVerified
                ? <><CheckCircle2 className="size-4 text-emerald-500" /> {formatDate(user.emailVerified)}</>
                : <><XCircle className="size-4 text-slate-300" /> Not verified</>}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Timezone</p>
            <p className="text-slate-700">{user.timezone}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">OAuth Providers</p>
            <p className="text-slate-700">
              {user.accounts.length > 0
                ? user.accounts.map((a) => a.provider).join(", ")
                : "Email / Password"}
            </p>
          </div>
          {user.deletedAt && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Deleted At</p>
              <p className="text-red-600">{formatDate(user.deletedAt)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Programmes */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-soft overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100">
          <BookOpen className="size-4 text-slate-400" />
          <h2 className="text-sm font-bold text-slate-700">
            Programmes ({user.programmes.length})
          </h2>
        </div>
        {user.programmes.length === 0 ? (
          <p className="px-6 py-8 text-sm text-slate-400 text-center">No programmes yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                {["Organization (Workplace)", "Institution", "Department", "Status", "Entries", "Evidence", "Start → End"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {user.programmes.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/60 transition">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/programmes/${p.id}` as Route}
                      className="font-semibold text-slate-900 hover:text-brand hover:underline"
                    >
                      {p.organization}
                    </Link>
                    <p className="text-xs text-slate-400">{p.unit}</p>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-700">{p.institution}</td>
                  <td className="px-4 py-3 text-slate-600">{p.department}</td>
                  <td className="px-4 py-3"><AdminBadge value={p.status} /></td>
                  <td className="px-4 py-3 font-mono text-slate-600">{p._count.entries}</td>
                  <td className="px-4 py-3 font-mono text-slate-600">{p._count.evidence}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {formatDate(p.startDate)} → {formatDate(p.endDate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Telegram Panel */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-soft">
        <div className="flex items-center gap-2 mb-4">
          <MessageCircle className="size-4 text-slate-400" />
          <h2 className="text-sm font-bold text-slate-700">Telegram</h2>
        </div>
        {user.telegramIdentity ? (
          <div className="grid gap-3 sm:grid-cols-3 text-sm">
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Username</p>
              <p className="text-slate-700">@{user.telegramIdentity.username ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Telegram ID</p>
              <p className="font-mono text-slate-700">{user.telegramIdentity.telegramUserId}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Last Seen</p>
              <p className="text-slate-700">{formatDate(user.telegramIdentity.lastSeenAt)}</p>
            </div>
            {user.botState && (
              <div className="sm:col-span-3">
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Bot State</p>
                <code className="text-xs bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 block text-slate-700">
                  {user.botState.state}
                </code>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No Telegram account linked.</p>
        )}
      </div>

      {/* LLM Usage */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-soft">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="size-4 text-slate-400" />
          <h2 className="text-sm font-bold text-slate-700">LLM Usage</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-4 text-sm">
          {[
            { label: "Total Requests", value: llm._count.id },
            { label: "Prompt Tokens", value: (llm._sum.promptTokens ?? 0).toLocaleString() },
            { label: "Output Tokens", value: (llm._sum.outputTokens ?? 0).toLocaleString() },
            {
              label: "Estimated Cost",
              value: `$${Number(llm._sum.estimatedCost ?? 0).toFixed(4)}`,
            },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">{label}</p>
              <p className="text-lg font-bold text-slate-900">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Audit Events */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-soft overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100">
          <Clock className="size-4 text-slate-400" />
          <h2 className="text-sm font-bold text-slate-700">Recent Audit Events</h2>
        </div>
        {user.auditEvents.length === 0 ? (
          <p className="px-6 py-8 text-sm text-slate-400 text-center">No audit events yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                {["Timestamp", "Action", "Entity", "ID"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {user.auditEvents.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50/60 transition">
                  <td className="px-4 py-3 text-xs text-slate-500">{formatDate(e.createdAt)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">{e.action}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{e.entityType}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400 truncate max-w-[120px]">{e.entityId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

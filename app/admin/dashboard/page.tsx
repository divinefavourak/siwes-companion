import {
  BarChart3,
  BookOpen,
  CheckCircle,
  Cpu,
  FolderSearch,
  MessageCircle,
  TriangleAlert,
  Users,
  Zap,
} from "lucide-react";
import { requireAdmin } from "@/src/lib/admin-auth";
import { prisma } from "@/src/lib/prisma";
import { AdminStatCard } from "@/src/components/admin/admin-stat-card";

export const dynamic = "force-dynamic";

async function getStats() {
  const now = new Date();

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const monthStart = new Date(now);
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    deletedUsers,
    totalProgrammes,
    activeProgrammes,
    todayEntries,
    pendingJobs,
    runningJobs,
    failedJobsLast24h,
    pendingEvidence,
    quarantinedEvidence,
    llmCost,
    telegramLinked,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { deletedAt: { not: null } } }),
    prisma.siwesProgramme.count(),
    prisma.siwesProgramme.count({ where: { status: "ACTIVE" } }),
    prisma.entry.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.job.count({ where: { status: "QUEUED" } }),
    prisma.job.count({ where: { status: "RUNNING" } }),
    prisma.job.count({ where: { status: "FAILED", updatedAt: { gte: dayAgo } } }),
    prisma.evidence.count({ where: { status: "PENDING" } }),
    prisma.evidence.count({ where: { status: "QUARANTINED" } }),
    prisma.llmUsage.aggregate({
      _sum: { estimatedCost: true },
      where: { createdAt: { gte: monthStart } },
    }),
    prisma.telegramIdentity.count(),
  ]);

  return {
    totalUsers,
    activeUsers: totalUsers - deletedUsers,
    deletedUsers,
    totalProgrammes,
    activeProgrammes,
    todayEntries,
    pendingJobs,
    runningJobs,
    failedJobsLast24h,
    pendingEvidence,
    quarantinedEvidence,
    llmCostThisMonth: Number(llmCost._sum.estimatedCost ?? 0),
    telegramLinked,
  };
}

export default async function AdminDashboardPage() {
  await requireAdmin();
  const stats = await getStats();

  const costFormatted =
    stats.llmCostThisMonth === 0
      ? "$0.00"
      : `$${stats.llmCostThisMonth.toFixed(4)}`;

  return (
    <div className="flex flex-col gap-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Admin Overview
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Platform health, usage stats, and activity at a glance.
        </p>
      </div>

      {/* KPI Cards — Row 1: Users & Programmes */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          title="Total Users"
          value={stats.totalUsers}
          icon={<Users />}
          accent="blue"
          description={`${stats.activeUsers} active · ${stats.deletedUsers} deleted`}
        />
        <AdminStatCard
          title="Active Users"
          value={stats.activeUsers}
          icon={<CheckCircle />}
          accent="green"
        />
        <AdminStatCard
          title="Total Programmes"
          value={stats.totalProgrammes}
          icon={<BookOpen />}
          accent="blue"
          description={`${stats.activeProgrammes} active`}
        />
        <AdminStatCard
          title="Active Programmes"
          value={stats.activeProgrammes}
          icon={<BookOpen />}
          accent="green"
        />
      </section>

      {/* KPI Cards — Row 2: Ops & Cost */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          title="Entries Today"
          value={stats.todayEntries}
          icon={<Zap />}
          accent="purple"
        />
        <AdminStatCard
          title="Jobs in Queue"
          value={stats.pendingJobs + stats.runningJobs}
          icon={<Cpu />}
          accent={stats.runningJobs > 0 ? "blue" : "slate"}
          description={`${stats.pendingJobs} queued · ${stats.runningJobs} running`}
        />
        <AdminStatCard
          title="Failed Jobs (24h)"
          value={stats.failedJobsLast24h}
          icon={<TriangleAlert />}
          accent={stats.failedJobsLast24h > 0 ? "red" : "green"}
        />
        <AdminStatCard
          title="LLM Cost (Month)"
          value={costFormatted}
          icon={<BarChart3 />}
          accent="orange"
        />
      </section>

      {/* KPI Cards — Row 3: Evidence & Telegram */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          title="Evidence Pending"
          value={stats.pendingEvidence}
          icon={<FolderSearch />}
          accent={stats.pendingEvidence > 0 ? "orange" : "green"}
        />
        <AdminStatCard
          title="Quarantined Evidence"
          value={stats.quarantinedEvidence}
          icon={<TriangleAlert />}
          accent={stats.quarantinedEvidence > 0 ? "red" : "slate"}
        />
        <AdminStatCard
          title="Telegram Linked"
          value={stats.telegramLinked}
          icon={<MessageCircle />}
          accent="blue"
        />
        <AdminStatCard
          title="Deleted Users"
          value={stats.deletedUsers}
          icon={<Users />}
          accent="slate"
        />
      </section>

      {/* Quick Links */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-soft">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">
          Quick Actions
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: "/admin/users", label: "Manage Users", icon: Users },
            { href: "/admin/evidence", label: "Review Evidence", icon: FolderSearch },
            { href: "/admin/jobs", label: "Monitor Jobs", icon: Cpu },
            { href: "/admin/llm-usage", label: "LLM Analytics", icon: BarChart3 },
          ].map(({ href, label, icon: Icon }) => (
            <a
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-brand hover:bg-sky-50 hover:text-brand"
            >
              <Icon className="size-4 shrink-0 text-slate-400" />
              {label}
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}

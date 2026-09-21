import Link from "next/link";
import type { Route } from "next";
import { ArrowUpRight, Check, Clock3, LockKeyhole, Plus, Sparkles } from "lucide-react";
import { getViewer } from "@/src/lib/viewer";
import { getRepositories } from "@/src/adapters/web/repositories";
import { dashboardProgress, phaseFor, phaseLabel } from "@/src/lib/dashboard";
import { dateFromTimestampInTimeZone, workingDates } from "@/src/core/shared/date";

export default async function DashboardPage() {
  const viewer = await getViewer();
  if (!viewer) return null;
  const repositories = getRepositories();
  const programme = await repositories.programmes.findActiveByUser(viewer.id);
  if (!programme) return <EmptyProgramme />;
  const today = dateFromTimestampInTimeZone(new Date(), programme.timezone);
  const entries = await repositories.entries.listForDateRange(viewer.id, programme.id, programme.startDate, today > programme.endDate ? programme.endDate : today);
  const progress = dashboardProgress(programme, entries, today);
  const phase = phaseFor(programme, today);
  const currentWeek = workingDates(programme).filter((date) => date <= today).slice(-5);
  const entryByDate = new Map(entries.map((entry) => [entry.workDate, entry]));

  return <div className="space-y-8">
    <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="text-sm font-semibold text-brand">{phaseLabel(phase)} phase</p><h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-ink">Keep your experience close.</h1><p className="mt-3 max-w-xl text-muted">A clear record starts with one honest note. You are on day {progress.currentDay} of {progress.totalDays}.</p></div><Link href="/dashboard/today" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-brand-strong">Continue today <ArrowUpRight className="size-4" /></Link></div>
    <section className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
      <div className="relative overflow-hidden rounded-[28px] bg-slate-950 p-7 text-white shadow-soft"><div className="absolute -right-20 -top-20 size-64 rounded-full bg-indigo-500/30 blur-3xl" /><div className="relative"><div className="flex items-start justify-between"><div><p className="text-sm text-indigo-200">{programme.organization}</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">{programme.title ?? `${programme.department} SIWES`}</h2></div><span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs text-indigo-100">{programme.durationMonths} months</span></div><div className="mt-10 flex items-end justify-between"><div><p className="text-5xl font-semibold tracking-[-0.06em]">{progress.percent}%</p><p className="mt-2 text-sm text-slate-300">{progress.completedDays} saved working days</p></div><div className="text-right"><p className="text-sm text-slate-300">{progress.remainingDays} days left in your record</p><div className="mt-3 h-2 w-40 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-indigo-400" style={{ width: `${progress.percent}%` }} /></div></div></div></div></div>
      <div className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm"><div className="flex items-center gap-2 text-sm font-semibold text-slate-500"><Clock3 className="size-4 text-brand" /> This week</div><div className="mt-6 space-y-3">{currentWeek.length ? currentWeek.map((date) => { const entry = entryByDate.get(date); const saved = entry?.status === "SAVED"; return <div key={date} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"><div><p className="text-sm font-semibold text-ink">{new Date(`${date}T00:00:00`).toLocaleDateString("en-NG", { weekday: "short" })}</p><p className="text-xs text-slate-400">{date}</p></div>{saved ? <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600"><Check className="size-4" /> Saved</span> : <Link href={`/dashboard/today?date=${date}`} className="text-xs font-semibold text-brand">Add note</Link>}</div>; }) : <p className="text-sm text-slate-500">Your working days will appear here.</p>}</div></div>
    </section>
    <section className="grid gap-5 md:grid-cols-3"><QuickCard icon={<Sparkles className="size-5" />} title="Document" body="Capture today while the details are fresh." href="/dashboard/today" action="Open logbook" /><QuickCard icon={<LockKeyhole className="size-5" />} title="Compile" body="Your report workspace unlocks in the final month." locked /><QuickCard icon={<LockKeyhole className="size-5" />} title="Defend" body="Practice questions unlock in your final phase." locked /></section>
  </div>;
}

function QuickCard({ icon, title, body, href, action, locked }: { icon: React.ReactNode; title: string; body: string; href?: Route; action?: string; locked?: boolean }) {
  return <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm"><div className="grid size-10 place-items-center rounded-2xl bg-indigo-50 text-brand">{icon}</div><h3 className="mt-5 text-lg font-semibold">{title}</h3><p className="mt-2 min-h-12 text-sm leading-6 text-muted">{body}</p>{locked ? <p className="mt-5 text-xs font-semibold text-slate-400">Coming later in your programme</p> : <Link href={href ?? "#"} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-brand">{action} <ArrowUpRight className="size-4" /></Link>}</div>;
}

function EmptyProgramme() {
  return <div className="mx-auto max-w-xl rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-soft"><div className="mx-auto grid size-14 place-items-center rounded-2xl bg-indigo-50 text-brand"><Plus className="size-6" /></div><h1 className="mt-5 text-3xl font-semibold tracking-tight">Start your SIWES record</h1><p className="mt-3 text-muted">Set up your placement once, then we will keep the daily loop simple.</p><Link href="/dashboard/setup" className="mt-7 inline-flex rounded-2xl bg-brand px-5 py-3 text-sm font-semibold text-white">Create SIWES</Link></div>;
}

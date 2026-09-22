import Link from "next/link";
import { ArrowUpRight, Check, Clock3, FileCheck, LockKeyhole, NotebookPen, Plus, ShieldCheck } from "lucide-react";
import { getViewer } from "@/src/lib/viewer";
import { getRepositories } from "@/src/adapters/web/repositories";
import { dashboardProgress, phaseFor, phaseLabel } from "@/src/lib/dashboard";
import { dateFromTimestampInTimeZone, workingDates } from "@/src/core/shared/date";
import {
  DashboardMotionContainer,
  AnimatedProgressCard,
  AnimatedMotionItem,
  MotionQuickCard
} from "@/src/components/dashboard-motion";

export default async function DashboardPage() {
  const viewer = await getViewer();
  if (!viewer) return null;
  const repositories = getRepositories();
  const programme = await repositories.programmes.findActiveByUser(viewer.id);
  if (!programme) return <EmptyProgramme />;
  const today = dateFromTimestampInTimeZone(new Date(), programme.timezone);
  const entries = await repositories.entries.listForDateRange(
    viewer.id,
    programme.id,
    programme.startDate,
    today > programme.endDate ? programme.endDate : today
  );
  const progress = dashboardProgress(programme, entries, today);
  const phase = phaseFor(programme, today);
  const currentWeek = workingDates(programme).filter((date) => date <= today).slice(-5);
  const entryByDate = new Map(entries.map((entry) => [entry.workDate, entry]));
  const compileUnlocked = phase === "COMPILE" || phase === "DEFEND";
  const defendUnlocked = phase === "DEFEND";

  return (
    <DashboardMotionContainer>
      {/* Hero Header */}
      <AnimatedMotionItem className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-brand">
            <span className="size-1.5 rounded-full bg-brand" />
            {phaseLabel(phase)} Phase
          </div>
          <h1 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            Keep your experience close.
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
            Every entry forms the verified foundation for your final technical report and oral defense. Day {progress.currentDay} of {progress.totalDays}.
          </p>
        </div>
        <Link
          href="/dashboard/today"
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand min-h-[44px]"
        >
          <span>Continue Today&apos;s Entry</span>
          <ArrowUpRight className="size-4" />
        </Link>
      </AnimatedMotionItem>

      {/* Progress & Current Week */}
      <section className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <AnimatedProgressCard
          organization={programme.organization}
          title={programme.title ?? `${programme.department} Industrial Training`}
          durationMonths={programme.durationMonths}
          percent={progress.percent}
          completedDays={progress.completedDays}
          remainingDays={progress.remainingDays}
        />

        {/* Current Week Card */}
        <AnimatedMotionItem>
          <div className="h-full rounded-[28px] border border-slate-200/80 bg-white p-7 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                <Clock3 className="size-4 text-brand" /> This Week
              </div>
              <span className="text-xs font-semibold text-slate-400">Recent Days</span>
            </div>

            <div className="mt-5 space-y-2.5">
              {currentWeek.length ? (
                currentWeek.map((date) => {
                  const entry = entryByDate.get(date);
                  const saved = entry?.status === "SAVED";
                  return (
                    <div
                      key={date}
                      className="flex items-center justify-between rounded-2xl bg-slate-50/80 px-4 py-3 border border-slate-100/80 transition hover:bg-slate-100/60 min-h-[44px]"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {new Date(`${date}T00:00:00`).toLocaleDateString("en-NG", {
                            weekday: "short",
                            month: "short",
                            day: "numeric"
                          })}
                        </p>
                      </div>
                      {saved ? (
                        <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          <Check className="size-3.5" /> Logged
                        </span>
                      ) : (
                        <Link
                          href={`/dashboard/today?date=${date}`}
                          className="text-xs font-semibold text-brand hover:underline"
                        >
                          Record Note &rarr;
                        </Link>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-500 py-4">Your working days will appear here.</p>
              )}
            </div>
          </div>
        </AnimatedMotionItem>
      </section>

      {/* Primary Workspaces Grid */}
      <section className="grid gap-5 md:grid-cols-3">
        <MotionQuickCard
          icon={<NotebookPen className="size-5" />}
          title="Daily Logbook"
          body="Quickly dump today's engineering tasks, code, equipment, or configurations while fresh."
          href="/dashboard/today"
          action="Open Today"
        />
        <MotionQuickCard
          icon={compileUnlocked ? <FileCheck className="size-5" /> : <LockKeyhole className="size-5 text-slate-400" />}
          title="Compile Report"
          body={
            compileUnlocked
              ? "Synthesize your verified entries into an institutional SIWES technical report."
              : "Report compilation unlocks automatically in your final training month."
          }
          href="/dashboard/report"
          action="Open Report Workspace"
          locked={!compileUnlocked}
        />
        <MotionQuickCard
          icon={defendUnlocked ? <ShieldCheck className="size-5" /> : <LockKeyhole className="size-5 text-slate-400" />}
          title="Oral Defense Prep"
          body={
            defendUnlocked
              ? "Practice explaining your technical contributions against realistic departmental panels."
              : "Defense simulator unlocks during your final phase before presentation."
          }
          href="/dashboard/defense"
          action="Open Defense Center"
          locked={!defendUnlocked}
        />
      </section>
    </DashboardMotionContainer>
  );
}

function EmptyProgramme() {
  return (
    <div className="mx-auto max-w-xl rounded-[28px] border border-slate-200/80 bg-white p-8 text-center shadow-soft">
      <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-sky-50 text-brand">
        <Plus className="size-6" />
      </div>
      <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-900">
        Start Your SIWES Record
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Set up your university, placement organization, and schedule once to initiate your daily logbook.
      </p>
      <Link
        href="/dashboard/setup"
        className="mt-6 inline-flex rounded-2xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-strong"
      >
        Create SIWES Programme
      </Link>
    </div>
  );
}

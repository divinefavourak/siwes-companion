"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  ArrowUpRight,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  Clock,
  Layers,
  Pencil,
  Tag,
  Wrench
} from "lucide-react";
import type { SummaryDraft } from "@/src/core/summaries/types";

type EntryItem = {
  date: string;
  weekday: string;
  label: string;
  status: "SAVED" | "DRAFT" | "MISSING" | "UPCOMING";
  previewText: string;
};

type MissingDate = { date: string; label: string; weekStart: string };

type WeekNav = {
  start: string;
  end: string;
  label: string;
  prev: string | null;
  next: string | null;
  isCurrent: boolean;
};

const MISSING_PREVIEW_LIMIT = 8;

export function HistoryTabs({
  dates,
  missingDates,
  week,
  programmeStartDate,
  programmeEndDate,
  today
}: {
  dates: EntryItem[];
  missingDates: MissingDate[];
  week: WeekNav;
  programmeStartDate: string;
  programmeEndDate: string;
  today: string;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"DAILY" | "WEEKLY" | "MONTHLY">("DAILY");
  const [weeklySummary, setWeeklySummary] = useState<{ key: string; data: SummaryDraft | null } | null>(null);
  const [monthlySummary, setMonthlySummary] = useState<{ key: string; data: SummaryDraft | null } | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [showAllMissing, setShowAllMissing] = useState(false);

  const weekFrom = week.start < programmeStartDate ? programmeStartDate : week.start;
  const weekTo = week.end > programmeEndDate ? programmeEndDate : week.end;
  const month = weekTo.slice(0, 7);
  const weekKey = `${weekFrom}:${weekTo}`;

  useEffect(() => {
    if (activeTab === "WEEKLY" && weeklySummary?.key !== weekKey) {
      setLoadingSummary(true);
      fetch(`/api/summaries/weekly?from=${weekFrom}&to=${weekTo}`)
        .then((res) => res.json())
        .then((data) => setWeeklySummary({ key: weekKey, data: data.summary ?? null }))
        .catch(() => {})
        .finally(() => setLoadingSummary(false));
    } else if (activeTab === "MONTHLY" && monthlySummary?.key !== month) {
      setLoadingSummary(true);
      fetch(`/api/summaries/monthly?month=${month}`)
        .then((res) => res.json())
        .then((data) => setMonthlySummary({ key: month, data: data.summary ?? null }))
        .catch(() => {})
        .finally(() => setLoadingSummary(false));
    }
  }, [activeTab, weekKey, weekFrom, weekTo, month, weeklySummary, monthlySummary]);

  const weekly = weeklySummary?.key === weekKey ? weeklySummary.data : null;
  const monthly = monthlySummary?.key === month ? monthlySummary.data : null;
  const monthLabel = new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
  const visibleMissing = showAllMissing ? missingDates : missingDates.slice(0, MISSING_PREVIEW_LIMIT);

  const tabs = [
    { id: "DAILY" as const, label: "Daily Entries", icon: Clock },
    { id: "WEEKLY" as const, label: "Weekly Rollup", icon: Calendar },
    { id: "MONTHLY" as const, label: "Monthly Summary", icon: Layers }
  ];

  return (
    <div className="space-y-6">
      {/* Week navigation */}
      <div className="flex flex-col gap-3 rounded-[24px] border border-slate-200/80 bg-white p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {week.prev ? (
            <Link
              href={`/dashboard/history?week=${week.prev}`}
              aria-label="Previous week"
              className="inline-flex size-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              <ChevronLeft className="size-4" />
            </Link>
          ) : (
            <span className="inline-flex size-10 items-center justify-center rounded-xl border border-slate-100 text-slate-300">
              <ChevronLeft className="size-4" />
            </span>
          )}
          <div className="min-w-0 px-1 text-center sm:text-left">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
              {week.isCurrent ? "This week" : "Week of"}
            </p>
            <p className="text-sm font-semibold text-slate-900">{week.label}</p>
          </div>
          {week.next ? (
            <Link
              href={`/dashboard/history?week=${week.next}`}
              aria-label="Next week"
              className="inline-flex size-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              <ChevronRight className="size-4" />
            </Link>
          ) : (
            <span className="inline-flex size-10 items-center justify-center rounded-xl border border-slate-100 text-slate-300">
              <ChevronRight className="size-4" />
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="history-jump" className="sr-only">Jump to date</label>
          <input
            key={week.start}
            id="history-jump"
            type="date"
            min={programmeStartDate}
            max={programmeEndDate}
            defaultValue={week.start < programmeStartDate ? programmeStartDate : week.start}
            onChange={(event) => {
              if (event.target.value) router.push(`/dashboard/history?week=${event.target.value}`);
            }}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-brand focus:bg-white min-h-[40px]"
          />
          {!week.isCurrent && (
            <Link
              href="/dashboard/history"
              className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 min-h-[40px] inline-flex items-center"
            >
              This week
            </Link>
          )}
        </div>
      </div>

      {/* Days that still need an entry, across the whole programme */}
      {missingDates.length > 0 && (
        <div className="rounded-[24px] border border-amber-200 bg-amber-50/70 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-700" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-amber-900">
                {missingDates.length} working {missingDates.length === 1 ? "day needs" : "days need"} an entry
              </p>
              <p className="mt-0.5 text-xs text-amber-800/80">
                Forgot to log something? Pick a day to back-fill it now.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {visibleMissing.map((item) => (
                  <Link
                    key={item.date}
                    href={`/dashboard/today?date=${item.date}`}
                    className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                  >
                    {item.label}
                  </Link>
                ))}
                {missingDates.length > MISSING_PREVIEW_LIMIT && (
                  <button
                    type="button"
                    onClick={() => setShowAllMissing((value) => !value)}
                    className="rounded-full px-3 py-1 text-xs font-semibold text-amber-900 underline-offset-2 hover:underline"
                  >
                    {showAllMissing ? "Show fewer" : `+${missingDates.length - MISSING_PREVIEW_LIMIT} more`}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Animated Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200/80 pb-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold min-h-[44px] transition ${
                isActive
                  ? "text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="historyTabIndicator"
                  className="absolute inset-0 rounded-xl bg-slate-900"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <Icon className="relative z-10 size-3.5" />
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content Crossfade with Framer Motion */}
      <AnimatePresence mode="wait">
        {activeTab === "DAILY" && (
          <motion.section
            key={`daily-${week.start}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-soft"
          >
            <div className="grid grid-cols-[1fr_auto] border-b border-slate-100 px-5 py-4 text-xs font-bold uppercase tracking-[0.16em] text-slate-400 sm:grid-cols-[1fr_1.5fr_auto] sm:px-7">
              <span>Date</span>
              <span className="hidden sm:block">Entry Preview</span>
              <span>Status</span>
            </div>
            {dates.length === 0 && (
              <p className="px-7 py-10 text-center text-sm text-slate-500">No working days in this week.</p>
            )}
            {dates.map((item) => (
              <div
                key={item.date}
                className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-slate-100 px-5 py-4 last:border-0 sm:grid-cols-[1fr_1.5fr_auto] sm:px-7 hover:bg-slate-50/50 transition-colors min-h-[56px]"
              >
                <div>
                  <p className="font-semibold text-slate-900 text-sm">
                    {item.weekday}
                    {item.date === today && <span className="ml-2 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold uppercase text-brand">Today</span>}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">{item.label}</p>
                </div>

                <p className="hidden truncate text-xs text-slate-600 sm:block pr-4">
                  {item.previewText}
                </p>

                {item.status === "UPCOMING" ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                    Upcoming
                  </span>
                ) : item.status === "SAVED" ? (
                  <div className="flex items-center gap-2">
                    <span className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 sm:inline-flex">
                      <Check className="size-3.5" /> Saved
                    </span>
                    <Link
                      href={`/dashboard/today?date=${item.date}`}
                      aria-label={`Edit entry for ${item.label}`}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 min-h-[36px]"
                    >
                      <Pencil className="size-3.5" /> Edit
                    </Link>
                  </div>
                ) : (
                  <Link
                    href={`/dashboard/today?date=${item.date}`}
                    className="inline-flex items-center gap-1 rounded-xl bg-sky-50 px-3 py-1.5 text-xs font-semibold text-brand hover:bg-sky-100 min-h-[36px]"
                  >
                    <CircleDashed className="size-3.5" /> {item.status === "DRAFT" ? "Continue" : "Fill in"} <ArrowUpRight className="size-3" />
                  </Link>
                )}
              </div>
            ))}
          </motion.section>
        )}

        {activeTab === "WEEKLY" && (
          <motion.div
            key="weekly"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
            className="space-y-6"
          >
            {loadingSummary ? (
              <div className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-soft space-y-4 animate-pulse">
                <div className="h-6 w-48 rounded-lg bg-slate-200" />
                <div className="h-20 w-full rounded-xl bg-slate-100" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="h-32 rounded-2xl bg-slate-100" />
                  <div className="h-32 rounded-2xl bg-slate-100" />
                </div>
              </div>
            ) : !weekly || weekly.sourceEntryIds.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-12 text-center">
                <p className="text-sm font-medium text-slate-600">No saved entries for this week yet.</p>
                <button
                  type="button"
                  onClick={() => setActiveTab("DAILY")}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                >
                  Fill in this week&apos;s days &rarr;
                </button>
              </div>
            ) : (
              <article className="rounded-[28px] border border-slate-200/80 bg-white p-7 shadow-soft space-y-6">
                <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-[0.16em] text-brand">
                      Weekly Synthesis
                    </span>
                    <h2 className="mt-1 text-xl font-bold text-slate-900">{week.label}</h2>
                  </div>
                  <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-brand">
                    {weekly.sourceEntryIds.length} Days Documented
                  </span>
                </div>

                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Synthesized Summary</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-700">{weekly.summary}</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-5 border border-slate-100">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Technical Activities Completed
                    </h4>
                    <ul className="mt-3 space-y-2 text-xs text-slate-700 list-disc pl-4">
                      {weekly.workCompleted.map((act, i) => (
                        <li key={i}>{act}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-5 border border-slate-100 space-y-4">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Tag className="size-3 text-brand" /> Skills Practiced
                      </h4>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {weekly.skills.map((skill, i) => (
                          <span key={i} className="rounded-full bg-white px-2.5 py-0.5 text-xs text-slate-700 border border-slate-200">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Wrench className="size-3 text-brand" /> Tools & Technologies
                      </h4>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {weekly.tools.map((tool, i) => (
                          <span key={i} className="rounded-full bg-white px-2.5 py-0.5 text-xs text-slate-700 border border-slate-200">
                            {tool}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            )}
          </motion.div>
        )}

        {activeTab === "MONTHLY" && (
          <motion.div
            key="monthly"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
            className="space-y-6"
          >
            {loadingSummary ? (
              <div className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-soft space-y-4 animate-pulse">
                <div className="h-6 w-48 rounded-lg bg-slate-200" />
                <div className="h-20 w-full rounded-xl bg-slate-100" />
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="h-24 rounded-2xl bg-slate-100" />
                  <div className="h-24 rounded-2xl bg-slate-100" />
                  <div className="h-24 rounded-2xl bg-slate-100" />
                </div>
              </div>
            ) : !monthly || monthly.sourceEntryIds.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-12 text-center">
                <p className="text-sm font-medium text-slate-600">No saved entries for {monthLabel} yet.</p>
                <button
                  type="button"
                  onClick={() => setActiveTab("DAILY")}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                >
                  Fill in this week&apos;s days &rarr;
                </button>
              </div>
            ) : (
              <article className="rounded-[28px] border border-slate-200/80 bg-white p-7 shadow-soft space-y-6">
                <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-[0.16em] text-brand">
                      Monthly Experience Summary
                    </span>
                    <h2 className="mt-1 text-xl font-bold text-slate-900">{monthLabel}</h2>
                  </div>
                  <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-brand">
                    {monthly.sourceEntryIds.length} Working Days
                  </span>
                </div>

                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Monthly Overview</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-700">{monthly.summary}</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 p-5 border border-slate-100">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Major Tasks</span>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{monthly.workCompleted.length}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-5 border border-slate-100">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Skills Acquired</span>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{monthly.skills.length}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-5 border border-slate-100">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Tools Used</span>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{monthly.tools.length}</p>
                  </div>
                </div>
              </article>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

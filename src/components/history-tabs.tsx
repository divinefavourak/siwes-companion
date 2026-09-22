"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUpRight,
  Calendar,
  Check,
  CircleDashed,
  Clock,
  Layers,
  Tag,
  Wrench
} from "lucide-react";
import type { SummaryDraft } from "@/src/core/summaries/types";

type EntryItem = {
  date: string;
  weekday: string;
  saved: boolean;
  previewText: string;
};

export function HistoryTabs({
  dates,
  programmeStartDate,
  today
}: {
  dates: EntryItem[];
  programmeStartDate: string;
  today: string;
}) {
  const [activeTab, setActiveTab] = useState<"DAILY" | "WEEKLY" | "MONTHLY">("DAILY");
  const [weeklySummary, setWeeklySummary] = useState<SummaryDraft | null>(null);
  const [monthlySummary, setMonthlySummary] = useState<SummaryDraft | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  useEffect(() => {
    if (activeTab === "WEEKLY" && !weeklySummary) {
      setLoadingSummary(true);
      const fromDate = dates.at(-7)?.date ?? programmeStartDate;
      fetch(`/api/summaries/weekly?from=${fromDate}&to=${today}`)
        .then((res) => res.json())
        .then((data) => setWeeklySummary(data.summary ?? null))
        .catch(() => {})
        .finally(() => setLoadingSummary(false));
    } else if (activeTab === "MONTHLY" && !monthlySummary) {
      setLoadingSummary(true);
      const currentMonth = today.slice(0, 7);
      fetch(`/api/summaries/monthly?month=${currentMonth}`)
        .then((res) => res.json())
        .then((data) => setMonthlySummary(data.summary ?? null))
        .catch(() => {})
        .finally(() => setLoadingSummary(false));
    }
  }, [activeTab, dates, programmeStartDate, today, weeklySummary, monthlySummary]);

  const tabs = [
    { id: "DAILY" as const, label: "Daily Entries", icon: Clock },
    { id: "WEEKLY" as const, label: "Weekly Rollup", icon: Calendar },
    { id: "MONTHLY" as const, label: "Monthly Summary", icon: Layers }
  ];

  return (
    <div className="space-y-6">
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
            key="daily"
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
            {dates.map((item) => (
              <div
                key={item.date}
                className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-slate-100 px-5 py-4 last:border-0 sm:grid-cols-[1fr_1.5fr_auto] sm:px-7 hover:bg-slate-50/50 transition-colors min-h-[56px]"
              >
                <div>
                  <p className="font-semibold text-slate-900 text-sm">{item.weekday}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{item.date}</p>
                </div>

                <p className="hidden truncate text-xs text-slate-600 sm:block pr-4">
                  {item.previewText}
                </p>

                {item.saved ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    <Check className="size-3.5" /> Saved
                  </span>
                ) : (
                  <Link
                    href={`/dashboard/today?date=${item.date}`}
                    className="inline-flex items-center gap-1 rounded-xl bg-sky-50 px-3 py-1.5 text-xs font-semibold text-brand hover:bg-sky-100 min-h-[36px]"
                  >
                    <CircleDashed className="size-3.5" /> Complete <ArrowUpRight className="size-3" />
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
            ) : !weeklySummary || weeklySummary.sourceEntryIds.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-12 text-center">
                <p className="text-sm font-medium text-slate-600">No recorded entries found for this week yet.</p>
                <Link
                  href="/dashboard/today"
                  className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                >
                  Record today&apos;s logbook entry &rarr;
                </Link>
              </div>
            ) : (
              <article className="rounded-[28px] border border-slate-200/80 bg-white p-7 shadow-soft space-y-6">
                <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-[0.16em] text-brand">
                      Weekly Synthesis
                    </span>
                    <h2 className="mt-1 text-xl font-bold text-slate-900">Current Week Rollup</h2>
                  </div>
                  <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-brand">
                    {weeklySummary.sourceEntryIds.length} Days Documented
                  </span>
                </div>

                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Synthesized Summary</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-700">{weeklySummary.summary}</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-5 border border-slate-100">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Technical Activities Completed
                    </h4>
                    <ul className="mt-3 space-y-2 text-xs text-slate-700 list-disc pl-4">
                      {weeklySummary.workCompleted.map((act, i) => (
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
                        {weeklySummary.skills.map((skill, i) => (
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
                        {weeklySummary.tools.map((tool, i) => (
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
            ) : !monthlySummary || monthlySummary.sourceEntryIds.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-12 text-center">
                <p className="text-sm font-medium text-slate-600">No recorded entries found for this month yet.</p>
                <Link
                  href="/dashboard/today"
                  className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                >
                  Record today&apos;s logbook entry &rarr;
                </Link>
              </div>
            ) : (
              <article className="rounded-[28px] border border-slate-200/80 bg-white p-7 shadow-soft space-y-6">
                <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-[0.16em] text-brand">
                      Monthly Experience Summary
                    </span>
                    <h2 className="mt-1 text-xl font-bold text-slate-900">Current Month Experience</h2>
                  </div>
                  <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-brand">
                    {monthlySummary.sourceEntryIds.length} Working Days
                  </span>
                </div>

                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Monthly Overview</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-700">{monthlySummary.summary}</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 p-5 border border-slate-100">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Major Tasks</span>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{monthlySummary.workCompleted.length}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-5 border border-slate-100">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Skills Acquired</span>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{monthlySummary.skills.length}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-5 border border-slate-100">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Tools Used</span>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{monthlySummary.tools.length}</p>
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

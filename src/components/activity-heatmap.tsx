import Link from "next/link";
import type { Route } from "next";
import { Flame, Trophy } from "lucide-react";
import { formatDateOnly } from "@/src/core/shared/date";
import type { HeatmapCell, HeatmapWeek, StreakSummary } from "@/src/core/progress/streaks";

const SAVED_SHADES = ["", "bg-emerald-200", "bg-emerald-300", "bg-emerald-500", "bg-emerald-700"];
const DAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", "Sun"];

function cellClass(cell: HeatmapCell) {
  switch (cell.state) {
    case "SAVED":
      return SAVED_SHADES[cell.level];
    case "DRAFT":
      return "bg-sky-200";
    case "MISSED":
      return "bg-rose-100 ring-1 ring-inset ring-rose-200";
    case "OFF":
      return "bg-slate-100";
    case "FUTURE":
      return "bg-white ring-1 ring-inset ring-slate-200";
    default:
      return "bg-transparent";
  }
}

function cellTitle(cell: HeatmapCell) {
  const date = formatDateOnly(cell.date, { weekday: "short", day: "numeric", month: "short" });
  switch (cell.state) {
    case "SAVED":
      return `${date}: saved entry (${cell.words} words)`;
    case "DRAFT":
      return `${date}: draft not saved yet`;
    case "MISSED":
      return `${date}: no entry, click to fill in`;
    case "OFF":
      return `${date}: non-working day`;
    default:
      return date;
  }
}

export function ActivityHeatmap({ weeks, streaks, today }: { weeks: HeatmapWeek[]; streaks: StreakSummary; today: string }) {
  let lastMonth = "";
  const monthLabels = weeks.map((week) => {
    const firstDay = week.cells.find((cell) => cell.state !== "OUTSIDE") ?? week.cells[0];
    const month = formatDateOnly(firstDay.date, { month: "short" });
    if (month === lastMonth) return "";
    lastMonth = month;
    return month;
  });

  return (
    <div className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-sm sm:p-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Logging activity</p>
          <p className="mt-1 text-sm text-slate-600">
            {streaks.atRisk
              ? `Log today to keep your ${streaks.current}-day streak going.`
              : streaks.todayLogged
                ? "Today is logged. Nice work."
                : streaks.current === 0
                  ? "Log a working day to start a streak."
                  : "Streaks count consecutive working days with a saved entry."}
          </p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2.5 rounded-2xl bg-orange-50 px-4 py-2.5">
            <Flame className={`size-5 ${streaks.current > 0 ? "text-orange-500" : "text-slate-300"}`} />
            <div>
              <p className="text-xl font-bold leading-none text-slate-900">{streaks.current}</p>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-500">day streak</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 rounded-2xl bg-amber-50 px-4 py-2.5">
            <Trophy className="size-5 text-amber-500" />
            <div>
              <p className="text-xl font-bold leading-none text-slate-900">{streaks.longest}</p>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-500">longest</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto pb-1">
        <div className="inline-grid grid-flow-col gap-[3px]" style={{ gridTemplateRows: "auto repeat(7, 14px)" }}>
          <span />
          {DAY_LABELS.map((label, index) => (
            <span key={index} className="pr-1.5 text-[10px] leading-[14px] text-slate-400">{label}</span>
          ))}
          {weeks.map((week, weekIndex) => (
            <div key={week.start} className="contents">
              <span className="h-4 w-[14px] overflow-visible whitespace-nowrap text-[10px] text-slate-400">{monthLabels[weekIndex]}</span>
              {week.cells.map((cell) => {
                const className = `block size-[14px] rounded-[3px] ${cellClass(cell)} ${cell.date === today ? "outline outline-2 outline-offset-1 outline-slate-900" : ""}`;
                const clickable = cell.state === "SAVED" || cell.state === "DRAFT" || cell.state === "MISSED";
                return clickable ? (
                  <Link
                    key={cell.date}
                    href={`/dashboard/today?date=${cell.date}` as Route}
                    title={cellTitle(cell)}
                    aria-label={cellTitle(cell)}
                    className={`${className} transition hover:scale-125`}
                  />
                ) : (
                  <span key={cell.date} title={cell.state === "OUTSIDE" ? undefined : cellTitle(cell)} className={className} />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5">
          Less
          {SAVED_SHADES.slice(1).map((shade) => (
            <span key={shade} className={`size-3 rounded-[3px] ${shade}`} />
          ))}
          More
        </span>
        <span className="flex items-center gap-1.5"><span className="size-3 rounded-[3px] bg-sky-200" /> Draft</span>
        <span className="flex items-center gap-1.5"><span className="size-3 rounded-[3px] bg-rose-100 ring-1 ring-inset ring-rose-200" /> Missed</span>
        <span className="flex items-center gap-1.5"><span className="size-3 rounded-[3px] bg-slate-100" /> Day off</span>
      </div>
    </div>
  );
}

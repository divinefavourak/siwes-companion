import {
  addDays,
  dateRange,
  formatDateOnly,
  isWorkingDate,
  startOfWeek,
  type DateOnly,
  type ProgrammeCalendar
} from "@/src/core/shared/date";
import type { Entry } from "@/src/core/entries/types";

export type LogbookDay = { date: DateOnly; weekday: string; label: string; text: string | null };
export type LogbookWeek = { number: number; start: DateOnly; end: DateOnly; days: LogbookDay[] };

/** Week 1 is the (Monday-based) week containing the programme start date. */
export function programmeWeekNumber(calendar: Pick<ProgrammeCalendar, "startDate">, date: DateOnly): number {
  const first = new Date(`${startOfWeek(calendar.startDate)}T00:00:00Z`).getTime();
  const current = new Date(`${startOfWeek(date)}T00:00:00Z`).getTime();
  return Math.round((current - first) / (7 * 86_400_000)) + 1;
}

/**
 * Lays out the logbook week by week. Only reviewed (SAVED) entries are printed;
 * working days without one stay blank so nothing is implied that wasn't recorded.
 */
export function buildLogbookWeeks(
  calendar: ProgrammeCalendar,
  entries: Pick<Entry, "workDate" | "status" | "editedText" | "generatedText">[],
  range: { from: DateOnly; to: DateOnly }
): LogbookWeek[] {
  const from = range.from < calendar.startDate ? calendar.startDate : range.from;
  const to = range.to > calendar.endDate ? calendar.endDate : range.to;
  if (to < from) return [];

  const saved = new Map(
    entries
      .filter((entry) => entry.status === "SAVED")
      .map((entry) => [entry.workDate, (entry.editedText ?? entry.generatedText ?? "").trim()])
  );

  const weeks: LogbookWeek[] = [];
  for (let weekStart = startOfWeek(from); weekStart <= to; weekStart = addDays(weekStart, 7)) {
    const weekEnd = addDays(weekStart, 6);
    const days = dateRange(weekStart, weekEnd)
      .filter((date) => date >= from && date <= to && (isWorkingDate(calendar, date) || saved.has(date)))
      .map((date) => ({
        date,
        weekday: formatDateOnly(date, { weekday: "long" }),
        label: formatDateOnly(date, { day: "numeric", month: "short", year: "numeric" }),
        text: saved.get(date) || null
      }));
    if (days.length > 0) {
      weeks.push({ number: programmeWeekNumber(calendar, weekStart), start: weekStart, end: weekEnd, days });
    }
  }
  return weeks;
}

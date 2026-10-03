import {
  addDays,
  dateRange,
  isWorkingDate,
  startOfWeek,
  workingDates,
  type DateOnly,
  type ProgrammeCalendar
} from "@/src/core/shared/date";
import type { Entry } from "@/src/core/entries/types";

export type StreakSummary = {
  /** Consecutive working days with a saved entry, ending today (or the last working day if today isn't logged yet). */
  current: number;
  longest: number;
  todayIsWorkingDay: boolean;
  todayLogged: boolean;
  /** True when a streak is alive but today still needs an entry to extend it. */
  atRisk: boolean;
};

export function computeStreaks(calendar: ProgrammeCalendar, savedDates: Iterable<DateOnly>, today: DateOnly): StreakSummary {
  const saved = new Set(savedDates);
  const elapsed = workingDates(calendar).filter((date) => date <= today);

  let longest = 0;
  let run = 0;
  for (const date of elapsed) {
    run = saved.has(date) ? run + 1 : 0;
    longest = Math.max(longest, run);
  }

  const todayIsWorkingDay = elapsed.at(-1) === today;
  const todayLogged = saved.has(today);
  // An unlogged today doesn't break the streak yet; count back from the previous working day.
  const countFrom = todayIsWorkingDay && !todayLogged ? elapsed.length - 2 : elapsed.length - 1;
  let current = 0;
  for (let index = countFrom; index >= 0 && saved.has(elapsed[index]); index -= 1) current += 1;

  return { current, longest, todayIsWorkingDay, todayLogged, atRisk: current > 0 && todayIsWorkingDay && !todayLogged };
}

export type HeatmapState = "SAVED" | "DRAFT" | "MISSED" | "OFF" | "FUTURE" | "OUTSIDE";
export type HeatmapCell = { date: DateOnly; state: HeatmapState; level: 0 | 1 | 2 | 3 | 4; words: number };
export type HeatmapWeek = { start: DateOnly; cells: HeatmapCell[] };

function wordCount(text: string | null | undefined) {
  return text ? text.trim().split(/\s+/).filter(Boolean).length : 0;
}

function levelFor(words: number): 1 | 2 | 3 | 4 {
  if (words >= 150) return 4;
  if (words >= 80) return 3;
  if (words >= 40) return 2;
  return 1;
}

/** One column per Monday-based week across the whole programme, Monday at the top. */
export function buildHeatmap(
  calendar: ProgrammeCalendar,
  entries: Pick<Entry, "workDate" | "status" | "rawText" | "editedText" | "generatedText">[],
  today: DateOnly
): HeatmapWeek[] {
  const byDate = new Map(entries.map((entry) => [entry.workDate, entry]));
  const weeks: HeatmapWeek[] = [];
  for (let start = startOfWeek(calendar.startDate); start <= calendar.endDate; start = addDays(start, 7)) {
    const cells = dateRange(start, addDays(start, 6)).map((date): HeatmapCell => {
      if (date < calendar.startDate || date > calendar.endDate) return { date, state: "OUTSIDE", level: 0, words: 0 };
      const entry = byDate.get(date);
      if (entry?.status === "SAVED") {
        const words = wordCount(entry.editedText ?? entry.generatedText ?? entry.rawText);
        return { date, state: "SAVED", level: levelFor(words), words };
      }
      if (date > today) return { date, state: "FUTURE", level: 0, words: 0 };
      if (entry) return { date, state: "DRAFT", level: 0, words: wordCount(entry.rawText) };
      return { date, state: isWorkingDate(calendar, date) ? "MISSED" : "OFF", level: 0, words: 0 };
    });
    weeks.push({ start, cells });
  }
  return weeks;
}

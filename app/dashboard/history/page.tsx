import { getViewer } from "@/src/lib/viewer";
import { getRepositories } from "@/src/adapters/web/repositories";
import {
  addDays,
  dateFromTimestampInTimeZone,
  dateRange,
  formatDateOnly,
  isWorkingDate,
  parseDateOnly,
  startOfWeek,
  workingDates,
  type DateOnly
} from "@/src/core/shared/date";
import { FileDown } from "lucide-react";
import { HistoryTabs } from "@/src/components/history-tabs";
import { currentEntryText } from "@/src/core/entries/entry-text";

function safeDate(value: string | undefined): DateOnly | null {
  if (!value) return null;
  try {
    return parseDateOnly(value);
  } catch {
    return null;
  }
}

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const viewer = await getViewer();
  if (!viewer) return null;
  const repositories = getRepositories();
  const programme = await repositories.programmes.findActiveByUser(viewer.id);
  if (!programme) return <div className="rounded-3xl bg-white p-8">Create your SIWES programme first.</div>;

  const params = await searchParams;
  const today = dateFromTimestampInTimeZone(new Date(), programme.timezone);
  const lastLoggableDay = today < programme.endDate ? today : programme.endDate;

  // Clamp the requested week into the programme so navigation never leaves it.
  const requested = safeDate(params.week) ?? lastLoggableDay;
  const anchor =
    requested < programme.startDate ? programme.startDate : requested > lastLoggableDay ? lastLoggableDay : requested;
  const weekStart = startOfWeek(anchor);
  const weekEnd = addDays(weekStart, 6);
  const firstWeekStart = startOfWeek(programme.startDate);
  const lastWeekStart = startOfWeek(lastLoggableDay);

  const elapsedWorkingDates = workingDates(programme).filter((date) => date <= today);
  const allEntries = await repositories.entries.listForDateRange(
    viewer.id,
    programme.id,
    programme.startDate,
    lastLoggableDay
  );
  const entryByDate = new Map(allEntries.map((entry) => [entry.workDate, entry]));

  const weekDates = dateRange(weekStart, weekEnd).filter(
    (date) =>
      date >= programme.startDate &&
      date <= programme.endDate &&
      (isWorkingDate(programme, date) || entryByDate.has(date))
  );

  const entryItems = weekDates.map((date) => {
    const entry = entryByDate.get(date);
    return {
      date,
      weekday: formatDateOnly(date, { weekday: "long" }),
      label: formatDateOnly(date, { day: "numeric", month: "short", year: "numeric" }),
      status: date > today ? ("UPCOMING" as const) : entry?.status === "SAVED" ? ("SAVED" as const) : entry ? ("DRAFT" as const) : ("MISSING" as const),
      previewText: entry ? (currentEntryText(entry) ?? entry.rawText) : date > today ? "Not yet" : "No note yet"
    };
  });

  const missingDates = elapsedWorkingDates
    .filter((date) => entryByDate.get(date)?.status !== "SAVED")
    .reverse()
    .map((date) => ({
      date,
      label: formatDateOnly(date, { weekday: "short", day: "numeric", month: "short" }),
      weekStart: startOfWeek(date)
    }));

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">Your record</p>
        <h1 className="mt-1 text-4xl font-bold tracking-tight text-ink">
          History that Remembers for You
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted max-w-xl">
          Browse any week of your placement, fill in days you missed, and edit saved entries. Weekly and monthly rollups follow the week you pick.
        </p>
      </div>
        <a
          href="/api/logbook/pdf"
          download
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 min-h-[44px]"
        >
          <FileDown className="size-4" /> Download logbook PDF
        </a>
      </div>

      <HistoryTabs
        dates={entryItems}
        missingDates={missingDates}
        week={{
          start: weekStart,
          end: weekEnd,
          label: `${formatDateOnly(weekStart, { day: "numeric", month: "short" })} – ${formatDateOnly(weekEnd, { day: "numeric", month: "short", year: "numeric" })}`,
          prev: weekStart > firstWeekStart ? addDays(weekStart, -7) : null,
          next: weekStart < lastWeekStart ? addDays(weekStart, 7) : null,
          isCurrent: weekStart === lastWeekStart
        }}
        programmeStartDate={programme.startDate}
        programmeEndDate={lastLoggableDay}
        today={today}
      />
    </div>
  );
}

import { getRepositories } from "@/src/adapters/web/repositories";
import { getViewer } from "@/src/lib/viewer";
import { dateFromTimestampInTimeZone, parseDateOnly, startOfWeek, type DateOnly } from "@/src/core/shared/date";
import { assertLoggableWorkDate } from "@/src/core/entries/entry-service";
import { TodayClient } from "@/src/components/today-client";

export default async function TodayPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const viewer = await getViewer();
  if (!viewer) return null;
  const repositories = getRepositories();
  const programme = await repositories.programmes.findActiveByUser(viewer.id);
  if (!programme) return <div className="rounded-3xl bg-white p-8">Create your SIWES programme first.</div>;
  const params = await searchParams;
  const today = dateFromTimestampInTimeZone(new Date(), programme.timezone);
  let date: DateOnly = today;
  if (params.date) {
    try {
      date = parseDateOnly(params.date);
      assertLoggableWorkDate(programme, date, today);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid date";
      return <div className="rounded-3xl bg-white p-8 text-sm text-slate-700">{message}.</div>;
    }
  }
  const entry = await repositories.entries.findOwnedByDate(viewer.id, programme.id, date);
  return (
    <TodayClient
      key={date}
      date={date}
      isToday={date === today}
      historyHref={`/dashboard/history?week=${startOfWeek(date)}`}
      initialEntry={entry}
    />
  );
}

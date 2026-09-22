import { getViewer } from "@/src/lib/viewer";
import { getRepositories } from "@/src/adapters/web/repositories";
import { dateFromTimestampInTimeZone, workingDates } from "@/src/core/shared/date";
import { HistoryTabs } from "@/src/components/history-tabs";

export default async function HistoryPage() {
  const viewer = await getViewer();
  if (!viewer) return null;
  const repositories = getRepositories();
  const programme = await repositories.programmes.findActiveByUser(viewer.id);
  if (!programme) return <div className="rounded-3xl bg-white p-8">Create your SIWES programme first.</div>;

  const today = dateFromTimestampInTimeZone(new Date(), programme.timezone);
  const dates = workingDates(programme).filter((date) => date <= today).slice(-14).reverse();
  const entries = await repositories.entries.listForDateRange(
    viewer.id,
    programme.id,
    dates.at(-1) ?? programme.startDate,
    today
  );
  const entryByDate = new Map(entries.map((entry) => [entry.workDate, entry]));

  const entryItems = dates.map((date) => {
    const entry = entryByDate.get(date);
    return {
      date,
      weekday: new Date(`${date}T00:00:00`).toLocaleDateString("en-NG", { weekday: "long" }),
      saved: entry?.status === "SAVED",
      previewText: entry?.editedText ?? entry?.generatedText ?? entry?.rawText ?? "No note yet"
    };
  });

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">Your record</p>
        <h1 className="mt-1 text-4xl font-bold tracking-tight text-ink">
          History that Remembers for You
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted max-w-xl">
          Review saved entries, synthesize weekly rollups, and inspect monthly summaries to ensure an accurate, verified timeline.
        </p>
      </div>

      <HistoryTabs
        dates={entryItems}
        programmeStartDate={programme.startDate}
        today={today}
      />
    </div>
  );
}

import { getRepositories } from "@/src/adapters/web/repositories";
import { getViewer } from "@/src/lib/viewer";
import { dateFromTimestampInTimeZone, parseDateOnly } from "@/src/core/shared/date";
import { TodayClient } from "@/src/components/today-client";

export default async function TodayPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const viewer = await getViewer();
  if (!viewer) return null;
  const repositories = getRepositories();
  const programme = await repositories.programmes.findActiveByUser(viewer.id);
  if (!programme) return <div className="rounded-3xl bg-white p-8">Create your SIWES programme first.</div>;
  const params = await searchParams;
  const date = params.date ? parseDateOnly(params.date) : dateFromTimestampInTimeZone(new Date(), programme.timezone);
  const entry = await repositories.entries.findOwnedByDate(viewer.id, programme.id, date);
  return <TodayClient date={date} initialEntry={entry} />;
}

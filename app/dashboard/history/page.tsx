import Link from "next/link";
import { ArrowUpRight, Check, CircleDashed } from "lucide-react";
import { getViewer } from "@/src/lib/viewer";
import { getRepositories } from "@/src/adapters/web/repositories";
import { dateFromTimestampInTimeZone, workingDates } from "@/src/core/shared/date";

export default async function HistoryPage() {
  const viewer = await getViewer();
  if (!viewer) return null;
  const repositories = getRepositories();
  const programme = await repositories.programmes.findActiveByUser(viewer.id);
  if (!programme) return <div className="rounded-3xl bg-white p-8">Create your SIWES programme first.</div>;
  const today = dateFromTimestampInTimeZone(new Date(), programme.timezone);
  const dates = workingDates(programme).filter((date) => date <= today).slice(-14).reverse();
  const entries = await repositories.entries.listForDateRange(viewer.id, programme.id, dates.at(-1) ?? programme.startDate, today);
  const entryByDate = new Map(entries.map((entry) => [entry.workDate, entry]));
  return <div className="space-y-8"><div><p className="text-sm font-semibold text-brand">Your record</p><h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em]">History that remembers for you.</h1><p className="mt-3 text-muted">Review saved entries, fill gaps while they are still close, and keep your timeline honest.</p></div><section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-soft"><div className="grid grid-cols-[1fr_auto] border-b border-slate-100 px-5 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 sm:grid-cols-[1fr_1.5fr_auto] sm:px-7"><span>Date</span><span className="hidden sm:block">Entry</span><span>Status</span></div>{dates.map((date) => { const entry = entryByDate.get(date); const saved = entry?.status === "SAVED"; return <div key={date} className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-slate-100 px-5 py-5 last:border-0 sm:grid-cols-[1fr_1.5fr_auto] sm:px-7"><div><p className="font-semibold text-ink">{new Date(`${date}T00:00:00`).toLocaleDateString("en-NG", { weekday: "long" })}</p><p className="mt-1 text-xs text-slate-400">{date}</p></div><p className="hidden truncate text-sm text-slate-500 sm:block">{entry?.editedText ?? entry?.generatedText ?? entry?.rawText ?? "No note yet"}</p>{saved ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600"><Check className="size-4" /> Saved</span> : <Link href={`/dashboard/today?date=${date}`} className="inline-flex items-center gap-1 text-xs font-semibold text-brand"><CircleDashed className="size-4" /> Complete <ArrowUpRight className="size-3" /></Link>}</div>; })}</section></div>;
}

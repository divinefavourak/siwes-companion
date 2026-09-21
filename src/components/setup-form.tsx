"use client";

import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";

const fields = [
  ["institution", "University or polytechnic", "e.g. University of Lagos"],
  ["department", "Department", "e.g. Computer Science"],
  ["level", "Level", "e.g. 300"],
  ["matricNumber", "Matric number", "e.g. CSC/22/0001"],
  ["organization", "Organization", "Where you are doing SIWES"],
  ["unit", "Unit or team", "e.g. Product Engineering"]
] as const;

export function SetupForm() {
  const [form, setForm] = useState<Record<string, string>>({ durationMonths: "3", startDate: "", endDate: "" });
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [message, setMessage] = useState("");
  function update(key: string, value: string) { setForm((current) => ({ ...current, [key]: value })); }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setStatus("saving"); setMessage("");
    const response = await fetch("/api/siwes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, durationMonths: Number(form.durationMonths), workingWeekdays: [1, 2, 3, 4, 5] }) });
    const payload = await response.json() as { error?: { message?: string } };
    if (!response.ok) { setStatus("error"); setMessage(payload.error?.message ?? "Check the details and try again."); return; }
    window.location.href = "/dashboard";
  }
  return <form onSubmit={submit} className="space-y-7"><div><p className="text-sm font-semibold text-brand">Programme setup</p><h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em]">Set up your placement once.</h1><p className="mt-3 max-w-xl leading-7 text-muted">This information shapes your timeline and the context used in your future report. You can edit it later.</p></div><section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-soft sm:p-8"><div className="flex flex-col gap-4 border-b border-slate-100 pb-6 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-semibold">Programme length</h2><p className="mt-1 text-sm text-muted">Choose the duration your institution gave you.</p></div><div className="flex rounded-2xl bg-slate-100 p-1">{[3, 6].map((duration) => <button key={duration} type="button" onClick={() => update("durationMonths", String(duration))} className={`rounded-xl px-4 py-2 text-sm font-semibold ${form.durationMonths === String(duration) ? "bg-white text-brand shadow-sm" : "text-slate-500"}`}>{duration} months</button>)}</div></div><div className="mt-7 grid gap-5 sm:grid-cols-2">{fields.map(([key, label, placeholder]) => <label key={key} className="space-y-2"><span className="text-sm font-semibold text-slate-700">{label}</span><input required value={form[key] ?? ""} onChange={(event) => update(key, event.target.value)} placeholder={placeholder} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition placeholder:text-slate-400 focus:border-brand focus:bg-white focus:ring-4 focus:ring-indigo-100" /></label>)}</div><div className="mt-5 grid gap-5 sm:grid-cols-2"><label className="space-y-2"><span className="text-sm font-semibold text-slate-700">Start date</span><input required type="date" value={form.startDate ?? ""} onChange={(event) => update("startDate", event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-brand focus:bg-white focus:ring-4 focus:ring-indigo-100" /></label><label className="space-y-2"><span className="text-sm font-semibold text-slate-700">End date</span><input required type="date" value={form.endDate ?? ""} onChange={(event) => update("endDate", event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-brand focus:bg-white focus:ring-4 focus:ring-indigo-100" /></label></div><div className="mt-7 rounded-2xl bg-indigo-50 p-4 text-sm leading-6 text-indigo-900">Working days start as Monday to Friday. You can change this later if your placement includes Saturdays or another schedule.</div></section>{message ? <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">{message}</p> : null}<button disabled={status === "saving"} className="inline-flex items-center gap-2 rounded-2xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200">{status === "saving" ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}Save programme</button></form>;
}

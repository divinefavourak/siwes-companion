"use client";

import { useState } from "react";
import { ArrowRight, Loader2, University } from "lucide-react";

const fields = [
  ["institution", "University or Polytechnic", "e.g. University of Lagos"],
  ["department", "Department", "e.g. Computer Science"],
  ["level", "Academic Level", "e.g. 300L or 400L"],
  ["matricNumber", "Matriculation Number", "e.g. CSC/22/0001"],
  ["organization", "Placement Organization", "e.g. MainOne / Equinix"],
  ["unit", "Assigned Unit / Department", "e.g. Network Engineering"]
] as const;

export function SetupForm() {
  const [form, setForm] = useState<Record<string, string>>({
    durationMonths: "3",
    startDate: "",
    endDate: ""
  });
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [message, setMessage] = useState("");

  function update(key: string, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("saving");
    setMessage("");
    const response = await fetch("/api/siwes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        durationMonths: Number(form.durationMonths),
        workingWeekdays: [1, 2, 3, 4, 5]
      })
    });
    const payload = (await response.json()) as { error?: { message?: string } };
    if (!response.ok) {
      setStatus("error");
      setMessage(payload.error?.message ?? "Please verify your input and try again.");
      return;
    }
    window.location.href = "/dashboard";
  }

  return (
    <form onSubmit={submit} className="space-y-7">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-brand">
          <University className="size-3.5" /> Programme Setup
        </div>
        <h1 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
          Set up your placement once.
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600 max-w-xl">
          This context determines your calendar timeline and automatically formats the cover page and organization overview of your technical report.
        </p>
      </div>

      <section className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-soft sm:p-8">
        <div className="flex flex-col gap-4 border-b border-slate-100 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Programme Duration</h2>
            <p className="mt-0.5 text-xs text-slate-500">Select the official duration approved by your department.</p>
          </div>
          <div className="flex rounded-2xl bg-slate-100 p-1">
            {[3, 6].map((duration) => (
              <button
                key={duration}
                type="button"
                onClick={() => update("durationMonths", String(duration))}
                className={`rounded-xl px-4 py-2 text-xs font-semibold min-h-[38px] transition ${
                  form.durationMonths === String(duration)
                    ? "bg-white text-brand shadow-sm font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {duration} Months
              </button>
            ))}
          </div>
        </div>

        <div className="mt-7 grid gap-5 sm:grid-cols-2">
          {fields.map(([key, label, placeholder]) => (
            <label key={key} className="space-y-1.5 block">
              <span className="text-xs font-semibold text-slate-700">{label}</span>
              <input
                required
                value={form[key] ?? ""}
                onChange={(event) => update(key, event.target.value)}
                placeholder={placeholder}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand focus:bg-white focus:ring-2 focus:ring-sky-100 min-h-[44px]"
              />
            </label>
          ))}
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className="space-y-1.5 block">
            <span className="text-xs font-semibold text-slate-700">Commencement Date</span>
            <input
              required
              type="date"
              value={form.startDate ?? ""}
              onChange={(event) => update("startDate", event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-brand focus:bg-white focus:ring-2 focus:ring-sky-100 min-h-[44px]"
            />
          </label>
          <label className="space-y-1.5 block">
            <span className="text-xs font-semibold text-slate-700">Completion Date</span>
            <input
              required
              type="date"
              value={form.endDate ?? ""}
              onChange={(event) => update("endDate", event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-brand focus:bg-white focus:ring-2 focus:ring-sky-100 min-h-[44px]"
            />
          </label>
        </div>

        <div className="mt-6 rounded-2xl bg-sky-50/70 border border-sky-100 p-4 text-xs leading-5 text-sky-900">
          Default schedule tracks Monday through Friday. You can add Saturdays or custom working days in Settings at any time.
        </div>
      </section>

      {message && (
        <p className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs font-medium text-amber-900">
          {message}
        </p>
      )}

      <button
        disabled={status === "saving"}
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-strong min-h-[48px]"
      >
        {status === "saving" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <ArrowRight className="size-4" />
        )}
        Save Programme & Launch Dashboard
      </button>
    </form>
  );
}

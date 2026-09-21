"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Edit3, Loader2, RefreshCw, Save, Sparkles, WifiOff } from "lucide-react";
import type { Entry } from "@/src/core/entries/types";

export function TodayClient({ date, initialEntry }: { date: string; initialEntry: Entry | null }) {
  const [entry, setEntry] = useState<Entry | null>(initialEntry);
  const [rawText, setRawText] = useState(initialEntry?.rawText ?? "");
  const [editedText, setEditedText] = useState(initialEntry?.editedText ?? initialEntry?.generatedText ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "generating" | "editing" | "error">("idle");
  const [message, setMessage] = useState("");
  const storageKey = useMemo(() => `siwes-draft:${date}`, [date]);

  useEffect(() => {
    if (!initialEntry) setRawText(window.localStorage.getItem(storageKey) ?? "");
  }, [initialEntry, storageKey]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (rawText) window.localStorage.setItem(storageKey, rawText);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [rawText, storageKey]);

  async function generate() {
    setStatus("saving"); setMessage("");
    try {
      const capture = await fetch("/api/entries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workDate: date, rawText, source: "WEB" }) });
      if (!capture.ok) throw new Error("Your note could not be saved yet.");
      const capturePayload = await capture.json() as { entry: Entry };
      setEntry(capturePayload.entry);
      setStatus("generating");
      const generated = await fetch(`/api/entries/${capturePayload.entry.id}/generate`, { method: "POST" });
      const payload = await generated.json() as { entry?: Entry; error?: { message?: string } };
      if (!generated.ok || !payload.entry) throw new Error(payload.error?.message ?? "The draft could not be generated.");
      setEntry(payload.entry); setEditedText(payload.entry.editedText ?? payload.entry.generatedText ?? ""); setStatus("idle");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Try again when you are online."); setStatus("error"); }
  }

  async function save() {
    if (!entry) return;
    setStatus("saving"); setMessage("");
    try {
      const response = await fetch(`/api/entries/${entry.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ editedText, expectedVersion: entry.version }) });
      const payload = await response.json() as { entry?: Entry; error?: { message?: string } };
      if (!response.ok || !payload.entry) throw new Error(payload.error?.message ?? "This entry changed elsewhere. Reload to review it.");
      setEntry(payload.entry); setStatus("idle"); window.localStorage.removeItem(storageKey); setMessage("Saved to your SIWES record.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save this entry."); setStatus("error"); }
  }

  const isBusy = status === "saving" || status === "generating";
  return <div className="mx-auto max-w-4xl space-y-7"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-semibold text-brand">Daily logbook</p><h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em]">What happened today?</h1><p className="mt-3 text-muted">{new Date(`${date}T00:00:00`).toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long" })}</p></div><span className="inline-flex items-center gap-2 self-start rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-500 shadow-sm"><span className="size-2 rounded-full bg-emerald-400" /> Your note stays yours</span></div>
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-soft sm:p-7"><label htmlFor="raw-note" className="text-sm font-semibold text-ink">Your rough note</label><p className="mt-2 text-sm leading-6 text-muted">Write it the way you remember it. Names, fragments and unfinished thoughts are okay.</p><textarea id="raw-note" value={rawText} onChange={(event) => setRawText(event.target.value)} placeholder="I worked on…" className="mt-5 min-h-48 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 p-4 text-base leading-7 outline-none transition placeholder:text-slate-400 focus:border-brand focus:bg-white focus:ring-4 focus:ring-indigo-100" maxLength={5000} /><div className="mt-3 flex flex-col justify-between gap-3 text-xs text-slate-400 sm:flex-row sm:items-center"><span>{rawText.length}/5000 characters · {rawText ? "Saved on this device" : "Nothing saved yet"}</span><button onClick={generate} disabled={rawText.trim().length < 3 || isBusy} className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-brand-strong disabled:shadow-none">{isBusy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}{status === "generating" ? "Creating draft…" : "Create grounded draft"}</button></div></section>
    {message ? <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"><WifiOff className="mt-0.5 size-4 shrink-0" /><span>{message}</span></div> : null}
    {entry?.generatedText ? <section className="rounded-[28px] border border-indigo-100 bg-indigo-50/70 p-5 sm:p-7"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><div className="flex items-center gap-2 text-sm font-semibold text-brand"><Sparkles className="size-4" /> AI draft</div><p className="mt-2 text-sm text-slate-600">Read it closely. It should describe what you actually did, not a bigger version of it.</p></div><span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-500"><Check className="size-3 text-emerald-500" /> Grounded in your note</span></div><textarea aria-label="Reviewed entry" value={editedText} onChange={(event) => { setEditedText(event.target.value); setStatus("editing"); }} className="mt-5 min-h-48 w-full resize-y rounded-2xl border border-white bg-white p-4 text-base leading-7 text-slate-800 outline-none focus:border-brand focus:ring-4 focus:ring-indigo-100" /><div className="mt-4 flex flex-wrap gap-3"><button onClick={save} disabled={!editedText.trim() || isBusy} className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white"><Save className="size-4" /> Save entry</button><button onClick={generate} disabled={isBusy} className="inline-flex items-center gap-2 rounded-xl border border-white bg-white px-4 py-3 text-sm font-semibold text-slate-700"><RefreshCw className="size-4" /> Regenerate</button><button onClick={() => setStatus("editing")} className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-transparent px-4 py-3 text-sm font-semibold text-brand"><Edit3 className="size-4" /> Edit freely</button></div>{entry.generationStatus === "NEEDS_CLARIFICATION" ? <p className="mt-4 text-sm font-medium text-amber-700">This note is a little thin. Add one detail if you can, then regenerate.</p> : null}</section> : null}
  </div>;
}

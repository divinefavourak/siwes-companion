"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Edit3,
  FileCheck2,
  FileText,
  Loader2,
  RefreshCw,
  Save,
  ShieldCheck,
  WifiOff
} from "lucide-react";
import type { Entry } from "@/src/core/entries/types";

export function TodayClient({
  date,
  initialEntry
}: {
  date: string;
  initialEntry: Entry | null;
}) {
  const [entry, setEntry] = useState<Entry | null>(initialEntry);
  const [rawText, setRawText] = useState(initialEntry?.rawText ?? "");
  const [editedText, setEditedText] = useState(
    initialEntry?.editedText ?? initialEntry?.generatedText ?? ""
  );
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
    setStatus("saving");
    setMessage("");
    try {
      const capture = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workDate: date, rawText, source: "WEB" })
      });
      if (!capture.ok) throw new Error("Your raw note could not be saved yet.");
      const capturePayload = (await capture.json()) as { entry: Entry };
      setEntry(capturePayload.entry);
      setStatus("generating");
      const generated = await fetch(`/api/entries/${capturePayload.entry.id}/generate`, {
        method: "POST"
      });
      const payload = (await generated.json()) as { entry?: Entry; error?: { message?: string } };
      if (!generated.ok || !payload.entry)
        throw new Error(payload.error?.message ?? "The formatted draft could not be generated.");
      setEntry(payload.entry);
      setEditedText(payload.entry.editedText ?? payload.entry.generatedText ?? "");
      setStatus("idle");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Try again when you are online.");
      setStatus("error");
    }
  }

  async function save() {
    if (!entry) return;
    setStatus("saving");
    setMessage("");
    try {
      const response = await fetch(`/api/entries/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editedText, expectedVersion: entry.version })
      });
      const payload = (await response.json()) as { entry?: Entry; error?: { message?: string } };
      if (!response.ok || !payload.entry)
        throw new Error(payload.error?.message ?? "This entry changed elsewhere. Reload to review.");
      setEntry(payload.entry);
      setStatus("idle");
      window.localStorage.removeItem(storageKey);
      setMessage("Saved to your official SIWES record.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save this entry.");
      setStatus("error");
    }
  }

  const isBusy = status === "saving" || status === "generating";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mx-auto max-w-4xl space-y-7"
    >
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-brand">
            <FileText className="size-3.5" /> Daily Logbook Entry
          </div>
          <h1 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            What did you work on today?
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 font-medium">
            {new Date(`${date}T00:00:00`).toLocaleDateString("en-NG", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric"
            })}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
          <ShieldCheck className="size-3.5 text-emerald-600" /> Grounded In Your Experience
        </span>
      </div>

      {/* Raw Note Section */}
      <section className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-soft sm:p-7">
        <label htmlFor="raw-note" className="block text-sm font-bold text-slate-900">
          Raw Technical Note
        </label>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Type freely: equipment names, error codes, configurations, scripts run, or tasks observed.
        </p>

        <textarea
          id="raw-note"
          value={rawText}
          onChange={(event) => setRawText(event.target.value)}
          placeholder="e.g. Configured Cisco catalyst switch VLANs 10 and 20, crimped 4 RJ45 patch cables, assisted senior engineer troubleshooting DNS resolution on subnet 192.168.1.0/24..."
          className="mt-4 min-h-48 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand focus:bg-white focus:ring-2 focus:ring-sky-100"
          maxLength={5000}
        />

        <div className="mt-4 flex flex-col justify-between gap-3 text-xs text-slate-400 sm:flex-row sm:items-center">
          <span className="font-medium text-slate-500">
            {rawText.length}/5000 characters &bull; {rawText ? "Cached on this device" : "Awaiting input"}
          </span>

          <button
            type="button"
            onClick={generate}
            disabled={rawText.trim().length < 3 || isBusy}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-strong disabled:opacity-50 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            {isBusy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileCheck2 className="size-4" />
            )}
            {status === "generating" ? "Formatting Logbook Entry..." : "Format Logbook Entry"}
          </button>
        </div>
      </section>

      {/* Network or Error Message */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-xs font-medium ${
              status === "error"
                ? "border-amber-200 bg-amber-50 text-amber-900"
                : "border-emerald-200 bg-emerald-50 text-emerald-900"
            }`}
          >
            {status === "error" ? (
              <WifiOff className="mt-0.5 size-4 shrink-0 text-amber-700" />
            ) : (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-700" />
            )}
            <span>{message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Skeleton while formatting (avoids layout shift) */}
      {status === "generating" && !entry?.generatedText && (
        <div className="rounded-[28px] border border-slate-200 bg-slate-50/50 p-6 space-y-4 animate-pulse">
          <div className="h-5 w-48 rounded-lg bg-slate-200" />
          <div className="h-24 w-full rounded-xl bg-slate-200" />
          <div className="h-9 w-32 rounded-xl bg-slate-200" />
        </div>
      )}

      {/* Formatted Supervisor-Ready Section */}
      <AnimatePresence>
        {entry?.generatedText && (
          <motion.section
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-soft sm:p-7"
          >
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand">
                  <CheckCircle2 className="size-4 text-emerald-600" /> Formatted Logbook Entry
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Supervisor-ready wording. You can review, refine, or rewrite before saving to your official record.
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                100% Grounded
              </span>
            </div>

            <textarea
              aria-label="Reviewed entry"
              value={editedText}
              onChange={(event) => {
                setEditedText(event.target.value);
                setStatus("editing");
              }}
              className="mt-4 min-h-48 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm leading-7 text-slate-800 outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-sky-100"
            />

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={save}
                disabled={!editedText.trim() || isBusy}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50 min-h-[44px]"
              >
                <Save className="size-4" /> Save Official Entry
              </button>

              <button
                type="button"
                onClick={generate}
                disabled={isBusy}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 min-h-[44px]"
              >
                <RefreshCw className="size-3.5" /> Re-format
              </button>

              <button
                type="button"
                onClick={() => setStatus("editing")}
                className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50/50 px-4 py-2.5 text-xs font-semibold text-brand transition hover:bg-sky-50 min-h-[44px]"
              >
                <Edit3 className="size-3.5" /> Edit Freely
              </button>
            </div>

            {entry.generationStatus === "NEEDS_CLARIFICATION" && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs leading-5 text-amber-900">
                <span className="font-semibold">Note is concise: </span>
                Consider mentioning the specific tool, software version, or method used for maximum logbook clarity.
              </div>
            )}
          </motion.section>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

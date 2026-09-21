"use client";

import { useEffect, useState } from "react";
import type { ReportDraft } from "@/src/core/reports/types";
import type { PresentationDraft } from "@/src/core/reports/presentation-service";

export function ReportPreview() {
  const [report, setReport] = useState<ReportDraft | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch("/api/report").then((response) => response.json()).then((payload: { report?: ReportDraft }) => setReport(payload.report ?? null)).finally(() => setLoading(false)); }, []);
  if (loading) return <Loading />;
  return <div className="space-y-5">{report?.sections.map((section) => <article key={section.sectionKey} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Section {section.position + 1}</p><h2 className="mt-2 text-xl font-semibold">{section.title}</h2></div><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">Review</span></div><p className="mt-5 whitespace-pre-line text-sm leading-7 text-slate-600">{section.generatedText || "No generated text yet."}</p>{section.unsupportedGaps.length ? <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-xs leading-5 text-slate-500">Still needed: {section.unsupportedGaps.join(" ")}</p> : null}</article>)}</div>;
}

export function PresentationPreview() {
  const [presentation, setPresentation] = useState<PresentationDraft | null>(null);
  useEffect(() => { fetch("/api/presentation").then((response) => response.json()).then((payload: { presentation?: PresentationDraft }) => setPresentation(payload.presentation ?? null)); }, []);
  return <div className="grid gap-5 md:grid-cols-2">{presentation?.slides.map((slide) => <article key={slide.position} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Slide {slide.position + 1}</p><h2 className="mt-2 text-xl font-semibold">{slide.title}</h2><ul className="mt-5 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600">{slide.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>{slide.unsupportedGaps.length ? <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-xs leading-5 text-slate-500">Still needed: {slide.unsupportedGaps.join(" ")}</p> : null}</article>)}</div>;
}

function Loading() { return <div className="space-y-4">{[1, 2, 3].map((item) => <div key={item} className="h-32 animate-pulse rounded-3xl bg-slate-200" />)}</div>; }

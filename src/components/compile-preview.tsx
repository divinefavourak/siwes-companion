"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  Copy,
  Download,
  Edit3,
  FileDown,
  Presentation as PresentationIcon,
  Printer,
  Save,
  ShieldCheck
} from "lucide-react";
import type { ReportDraft, ReportSectionDraft } from "@/src/core/reports/types";
import type { PresentationDraft } from "@/src/core/reports/presentation-service";

export function ReportPreview() {
  const [report, setReport] = useState<ReportDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [customTexts, setCustomTexts] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/report")
      .then((response) => response.json())
      .then((payload: { report?: ReportDraft }) => {
        if (payload.report) {
          setReport(payload.report);
          const initialTexts: Record<string, string> = {};
          payload.report.sections.forEach((s) => {
            initialTexts[s.sectionKey] = s.generatedText;
          });
          setCustomTexts(initialTexts);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  function handleSaveSection() {
    setEditingKey(null);
  }

  function getSectionText(section: ReportSectionDraft) {
    return customTexts[section.sectionKey] ?? section.generatedText;
  }

  function assembleFullReportMarkdown(): string {
    if (!report) return "";
    let md = "# SIWES Technical Report\n\n";
    report.sections.forEach((s) => {
      md += `## ${s.title}\n\n${getSectionText(s)}\n\n`;
    });
    return md;
  }

  function copyReport() {
    navigator.clipboard.writeText(assembleFullReportMarkdown());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function downloadReport() {
    const text = assembleFullReportMarkdown();
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "SIWES_Final_Report.md";
    a.click();
    URL.revokeObjectURL(url);
  }

  function printReport() {
    window.print();
  }

  if (loading) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-14 rounded-2xl bg-slate-200" />
        <div className="h-44 rounded-3xl bg-slate-100" />
        <div className="h-44 rounded-3xl bg-slate-100" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Actions Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 border border-slate-200 shadow-sm print:hidden">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Report Outline</span>
          <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-brand">
            {report?.sections.length ?? 0} Sections Assembled
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={copyReport}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:border-brand hover:text-brand min-h-[40px]"
          >
            {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
            {copied ? "Copied Markdown" : "Copy Markdown"}
          </button>
          <button
            type="button"
            onClick={downloadReport}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:border-brand hover:text-brand min-h-[40px]"
          >
            <Download className="size-3.5" /> Download .md
          </button>
          <button
            type="button"
            onClick={printReport}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 min-h-[40px]"
          >
            <Printer className="size-3.5" /> Print / Export PDF
          </button>
        </div>
      </div>

      {/* Sections List */}
      <div className="space-y-5">
        {report?.sections.map((section) => {
          const isEditing = editingKey === section.sectionKey;
          const currentText = getSectionText(section);

          return (
            <article
              key={section.sectionKey}
              className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-sm transition hover:border-slate-300"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-brand">
                    Section {section.position + 1}
                  </span>
                  <h2 className="mt-1 text-xl font-bold text-slate-900">{section.title}</h2>
                </div>

                <div className="flex items-center gap-2 print:hidden">
                  {isEditing ? (
                    <button
                      type="button"
                      onClick={() => handleSaveSection()}
                      className="inline-flex items-center gap-1 rounded-xl bg-brand px-3.5 py-1.5 text-xs font-semibold text-white min-h-[36px]"
                    >
                      <Save className="size-3.5" /> Done
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingKey(section.sectionKey)}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 min-h-[36px]"
                    >
                      <Edit3 className="size-3.5" /> Edit Section
                    </button>
                  )}
                </div>
              </div>

              {isEditing ? (
                <div className="mt-4">
                  <textarea
                    rows={6}
                    value={currentText}
                    onChange={(e) =>
                      setCustomTexts({ ...customTexts, [section.sectionKey]: e.target.value })
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 outline-none focus:border-brand focus:bg-white focus:ring-2 focus:ring-sky-100"
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    Edits are retained for your final document and will not be overwritten by system sync.
                  </p>
                </div>
              ) : (
                <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-700">
                  {currentText || "No entry details available yet for this section."}
                </p>
              )}

              {section.unsupportedGaps.length > 0 && (
                <div className="mt-4 rounded-2xl bg-amber-50/80 border border-amber-100 p-4 text-xs leading-5 text-amber-900 print:hidden">
                  <span className="font-bold text-amber-800">Identified Coverage Gap: </span>
                  {section.unsupportedGaps.join(" ")}
                  <span className="block mt-1 text-amber-700">
                    Log more details during your daily entries to substantiate this section with verified evidence.
                  </span>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

export function PresentationPreview() {
  const [presentation, setPresentation] = useState<PresentationDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSlide, setActiveSlide] = useState(0);
  const [customBullets, setCustomBullets] = useState<Record<number, string[]>>({});

  useEffect(() => {
    fetch("/api/presentation")
      .then((response) => response.json())
      .then((payload: { presentation?: PresentationDraft }) => {
        if (payload.presentation) {
          setPresentation(payload.presentation);
          const bulletsMap: Record<number, string[]> = {};
          payload.presentation.slides.forEach((slide) => {
            bulletsMap[slide.position] = [...slide.bullets];
          });
          setCustomBullets(bulletsMap);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  function getBullets(slideIndex: number, originalBullets: string[]) {
    return customBullets[slideIndex] ?? originalBullets;
  }

  function downloadSlidesMarkdown() {
    if (!presentation) return "";
    let md = `# ${presentation.title}\n\n---\n\n`;
    presentation.slides.forEach((slide) => {
      md += `## ${slide.title}\n\n`;
      getBullets(slide.position, slide.bullets).forEach((b) => {
        md += `- ${b}\n`;
      });
      md += "\n---\n\n";
    });

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "SIWES_Presentation_Slides.md";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-14 rounded-2xl bg-slate-200" />
        <div className="h-72 rounded-[28px] bg-slate-900" />
      </div>
    );
  }

  const slides = presentation?.slides ?? [];
  const currentSlide = slides[activeSlide];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <PresentationIcon className="size-4 text-brand" />
          <span className="text-xs font-bold text-slate-900">{presentation?.title}</span>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            {slides.length} Slides
          </span>
        </div>

        <button
          type="button"
          onClick={downloadSlidesMarkdown}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:border-brand hover:text-brand min-h-[40px]"
        >
          <FileDown className="size-3.5" /> Download Slides (.md)
        </button>
      </div>

      {/* Animated Slide Carousel Preview */}
      {currentSlide && (
        <div className="relative overflow-hidden rounded-[28px] border border-slate-800 bg-slate-950 p-7 sm:p-9 text-white shadow-soft min-h-[340px] flex flex-col justify-between">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSlide}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <div className="flex items-center justify-between text-xs text-sky-300">
                <span className="font-bold uppercase tracking-wider">
                  Slide {activeSlide + 1} of {slides.length}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-sky-200">
                  <ShieldCheck className="size-3" /> Grounded Deck
                </span>
              </div>

              <h2 className="mt-4 text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                {currentSlide.title}
              </h2>

              <ul className="mt-6 space-y-3">
                {getBullets(currentSlide.position, currentSlide.bullets).map((bullet, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm text-slate-200">
                    <span className="mt-1.5 size-1.5 rounded-full bg-sky-400 shrink-0" />
                    <span className="leading-relaxed">{bullet}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </AnimatePresence>

          {/* Navigation Controls */}
          <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-4">
            <button
              type="button"
              disabled={activeSlide === 0}
              onClick={() => setActiveSlide((prev) => Math.max(0, prev - 1))}
              className="rounded-xl border border-white/20 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-white/10 disabled:opacity-30 min-h-[38px]"
            >
              Previous Slide
            </button>

            <div className="flex items-center gap-1.5">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveSlide(idx)}
                  className={`size-2.5 rounded-full transition-all ${
                    idx === activeSlide ? "w-6 bg-sky-400" : "bg-white/30 hover:bg-white/50"
                  }`}
                  aria-label={`Slide ${idx + 1}`}
                />
              ))}
            </div>

            <button
              type="button"
              disabled={activeSlide === slides.length - 1}
              onClick={() => setActiveSlide((prev) => Math.min(slides.length - 1, prev + 1))}
              className="rounded-xl border border-white/20 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-white/10 disabled:opacity-30 min-h-[38px]"
            >
              Next Slide
            </button>
          </div>
        </div>
      )}

      {/* Grid of All Slides */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">All Slides Overview</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {slides.map((slide, index) => (
            <button
              key={slide.position}
              type="button"
              onClick={() => setActiveSlide(index)}
              className={`text-left rounded-2xl border p-5 transition ${
                index === activeSlide
                  ? "border-brand bg-sky-50/60 ring-2 ring-brand/20 shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <span className="text-[11px] font-bold text-brand uppercase tracking-wider">
                Slide {index + 1}
              </span>
              <h3 className="mt-1 font-bold text-sm text-slate-900">{slide.title}</h3>
              <p className="mt-2 text-xs text-slate-500 line-clamp-2">
                {slide.bullets.join(" • ") || "No bullet points added"}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

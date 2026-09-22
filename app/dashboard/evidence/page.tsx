"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ExternalLink,
  FileText,
  FolderArchive,
  Globe,
  HardDrive,
  Plus,
  ShieldCheck,
  Tag,
  X
} from "lucide-react";
import type { EvidenceRecord } from "@/src/core/evidence/evidence-service";

type Kind = "ALL" | "URL" | "NOTE" | "FILE";

export default function EvidenceVaultPage() {
  const [evidenceList, setEvidenceList] = useState<EvidenceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Kind>("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [kind, setKind] = useState<"URL" | "NOTE" | "FILE">("URL");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [fileName, setFileName] = useState("");
  const [mimeType, setMimeType] = useState("");
  const [byteSize, setByteSize] = useState<number | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    fetchEvidence();
  }, []);

  async function fetchEvidence() {
    try {
      const response = await fetch("/api/evidence");
      if (response.ok) {
        const data = await response.json();
        setEvidenceList(data.evidence ?? []);
      }
    } catch {
      // Offline demo fallback
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateEvidence(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    const payload: Record<string, unknown> = { kind, title };
    if (kind === "URL") payload.url = url;
    if (kind === "NOTE") payload.note = note;
    if (kind === "FILE") {
      payload.fileName = fileName;
      payload.mimeType = mimeType;
      payload.byteSize = byteSize;
    }

    try {
      const response = await fetch("/api/evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        setEvidenceList([data.evidence, ...evidenceList]);
        setIsModalOpen(false);
        setTitle("");
        setUrl("");
        setNote("");
        setFileName("");
        setMimeType("");
        setByteSize(undefined);
      } else {
        const errorData = await response.json();
        setFormError(errorData.error?.message ?? "Failed to save evidence.");
      }
    } catch {
      setFormError("Could not connect to save evidence.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setMimeType(file.type || "application/octet-stream");
      setByteSize(file.size);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  }

  const filteredList = evidenceList.filter((item) => {
    if (filter === "ALL") return true;
    return item.kind === filter;
  });

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-brand">
            <FolderArchive className="size-3.5" /> Proof of Experience
          </div>
          <h1 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            Evidence Vault
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600 max-w-xl">
            Attach diagrams, repository PRs, configs, and artifacts to substantiate your SIWES technical report and oral defense presentation.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-strong min-h-[44px]"
        >
          <Plus className="size-4" /> Attach Evidence
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/80 pb-4">
        {(["ALL", "URL", "NOTE", "FILE"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition min-h-[40px] ${
              filter === tab
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
            }`}
          >
            {tab === "ALL" && "All Evidence"}
            {tab === "URL" && "Web Links"}
            {tab === "NOTE" && "Technical Notes"}
            {tab === "FILE" && "Files & Artifacts"}
            <span className="ml-1.5 opacity-60">
              ({tab === "ALL" ? evidenceList.length : evidenceList.filter((e) => e.kind === tab).length})
            </span>
          </button>
        ))}
      </div>

      {/* Evidence Grid */}
      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-3xl bg-slate-200" />
          ))}
        </div>
      ) : filteredList.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/60 p-12 text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-sky-50 text-brand">
            <FolderArchive className="size-6" />
          </div>
          <h2 className="mt-4 text-base font-bold text-slate-900">No evidence attached yet</h2>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            Attach pull requests, network topology diagrams, or meeting notes to ground your final report and presentation.
          </p>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-brand-strong min-h-[40px]"
          >
            <Plus className="size-3.5" /> Attach First Item
          </button>
        </div>
      ) : (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.06 } }
          }}
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {filteredList.map((item) => (
            <motion.article
              key={item.id}
              variants={{
                hidden: { opacity: 0, y: 10 },
                visible: { opacity: 1, y: 0 }
              }}
              whileHover={{ y: -2 }}
              className="flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm transition hover:border-slate-300"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] font-semibold ${
                      item.kind === "URL"
                        ? "bg-sky-50 text-sky-700"
                        : item.kind === "NOTE"
                        ? "bg-amber-50 text-amber-800"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {item.kind === "URL" && <Globe className="size-3" />}
                    {item.kind === "NOTE" && <FileText className="size-3" />}
                    {item.kind === "FILE" && <HardDrive className="size-3" />}
                    {item.kind}
                  </span>

                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                    {item.status}
                  </span>
                </div>

                <h3 className="mt-3 text-base font-bold text-slate-900">{item.title}</h3>

                {item.kind === "URL" && item.url && (
                  <div className="mt-2">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline break-all"
                    >
                      {item.url} <ExternalLink className="size-3 shrink-0" />
                    </a>
                  </div>
                )}

                {item.kind === "NOTE" && item.note && (
                  <p className="mt-2 text-xs leading-5 text-slate-600 line-clamp-4 whitespace-pre-wrap bg-slate-50 p-3 rounded-xl border border-slate-100">
                    {item.note}
                  </p>
                )}

                {item.kind === "FILE" && (
                  <div className="mt-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 border border-slate-100">
                    <p className="font-semibold text-slate-800 truncate">{item.fileName}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {item.mimeType} &bull; {item.byteSize ? `${Math.round(item.byteSize / 1024)} KB` : "File attached"}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Tag className="size-3" /> SIWES Vault
                </span>
                <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                  <ShieldCheck className="size-3" /> Grounded
                </span>
              </div>
            </motion.article>
          ))}
        </motion.div>
      )}

      {/* Attach Evidence Modal with Framer Motion */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-lg rounded-[28px] border border-slate-200 bg-white p-7 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Attach Verified Evidence</h3>
                  <p className="text-xs text-slate-500">Document proof of real engineering or technical work</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="grid size-11 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="size-4" />
                </button>
              </div>

              <form onSubmit={handleCreateEvidence} className="mt-5 space-y-4">
                {/* Kind Selector */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Type of Evidence</label>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setKind("URL")}
                      className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-semibold transition min-h-[44px] ${
                        kind === "URL" ? "border-brand bg-sky-50 text-brand" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <Globe className="size-3.5" /> Web Link
                    </button>
                    <button
                      type="button"
                      onClick={() => setKind("NOTE")}
                      className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-semibold transition min-h-[44px] ${
                        kind === "NOTE" ? "border-brand bg-sky-50 text-brand" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <FileText className="size-3.5" /> Technical Note
                    </button>
                    <button
                      type="button"
                      onClick={() => setKind("FILE")}
                      className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-semibold transition min-h-[44px] ${
                        kind === "FILE" ? "border-brand bg-sky-50 text-brand" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <HardDrive className="size-3.5" /> File Upload
                    </button>
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="text-xs font-semibold text-slate-600">Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cisco Switch Configuration Script"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-sky-100"
                  />
                </div>

                {/* URL */}
                {kind === "URL" && (
                  <div>
                    <label className="text-xs font-semibold text-slate-600">URL</label>
                    <input
                      type="url"
                      required
                      placeholder="https://github.com/my-org/project/pull/42"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-sky-100"
                    />
                  </div>
                )}

                {/* Note */}
                {kind === "NOTE" && (
                  <div>
                    <label className="text-xs font-semibold text-slate-600">Note or Code Snippet</label>
                    <textarea
                      required
                      rows={4}
                      placeholder="Document technical details, commands, or database migrations..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-sky-100"
                    />
                  </div>
                )}

                {/* File */}
                {kind === "FILE" && (
                  <div>
                    <label className="text-xs font-semibold text-slate-600">Choose File</label>
                    <input
                      type="file"
                      required
                      onChange={handleFileSelect}
                      className="mt-1 block w-full text-xs text-slate-500 file:mr-3 file:rounded-xl file:border-0 file:bg-sky-50 file:px-3 file:py-2.5 file:text-xs file:font-semibold file:text-brand hover:file:bg-sky-100"
                    />
                    {fileName && (
                      <p className="mt-2 text-xs text-slate-600">
                        Selected: <span className="font-semibold">{fileName}</span> ({Math.round((byteSize ?? 0) / 1024)} KB)
                      </p>
                    )}
                  </div>
                )}

                {formError && (
                  <div className="rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-700">
                    {formError}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 min-h-[40px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-xl bg-brand px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-brand-strong disabled:opacity-50 min-h-[40px]"
                  >
                    {submitting ? "Saving..." : "Save to Vault"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

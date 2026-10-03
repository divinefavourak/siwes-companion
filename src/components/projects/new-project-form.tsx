"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { Loader2, Plus } from "lucide-react";
import { PROJECT_KINDS, PROJECT_KIND_LABELS, type ProjectKind } from "@/src/core/projects/types";

export function NewProjectForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<ProjectKind>("CISCO_LAB");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, kind, description })
      });
      const payload = (await response.json()) as { project?: { id: string }; error?: { message?: string } };
      if (!response.ok || !payload.project) throw new Error(payload.error?.message ?? "Could not create the project.");
      router.push(`/dashboard/projects/${payload.project.id}` as Route);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the project.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-soft">
      <p className="text-sm font-bold text-slate-900">New project board</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1.4fr_1fr]">
        <input
          aria-label="Project name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. CCNA Lab 4 — Inter-VLAN routing"
          maxLength={120}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-brand focus:bg-white"
        />
        <select
          aria-label="Project type"
          value={kind}
          onChange={(event) => setKind(event.target.value as ProjectKind)}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-brand focus:bg-white"
        >
          {PROJECT_KINDS.map((value) => (
            <option key={value} value={value}>{PROJECT_KIND_LABELS[value]}</option>
          ))}
        </select>
      </div>
      <textarea
        aria-label="Project description"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        placeholder="What is this project about? (optional)"
        maxLength={2000}
        rows={2}
        className="mt-3 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-brand focus:bg-white"
      />
      <div className="mt-3 flex items-center gap-3">
        <button
          type="submit"
          disabled={saving || name.trim().length < 2}
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-strong disabled:opacity-50 min-h-[40px]"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Create board
        </button>
        {error && <span className="text-xs font-medium text-red-600">{error}</span>}
      </div>
    </form>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { motion } from "framer-motion";
import { BookOpenCheck, Check, Loader2, Plus, Trash2, X } from "lucide-react";
import {
  TASK_COLUMNS,
  TASK_COLUMN_LABELS,
  type BoardProject,
  type BoardTask,
  type ChecklistItem,
  type TaskColumn
} from "@/src/core/projects/types";
import { buildTaskLogLine } from "@/src/core/projects/project-service";

async function send<T>(url: string, method: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const payload = (await response.json()) as T & { error?: { message?: string } };
  if (!response.ok) throw new Error(payload.error?.message ?? "Something went wrong. Try again.");
  return payload;
}

export function TaskPanel({
  task,
  project,
  today,
  programmeStartDate,
  onClose,
  onChange,
  onMove,
  onDelete
}: {
  task: BoardTask;
  project: BoardProject;
  today: string;
  programmeStartDate: string;
  onClose: () => void;
  onChange: (task: BoardTask) => void;
  onMove: (column: TaskColumn) => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [dueDate, setDueDate] = useState(task.dueDate ?? "");
  const [newStep, setNewStep] = useState("");
  const [logDate, setLogDate] = useState(today);
  const [logNote, setLogNote] = useState("");
  const [busy, setBusy] = useState<"save" | "log" | "delete" | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string; date?: string } | null>(null);

  const dirty = title !== task.title || description !== (task.description ?? "") || dueDate !== (task.dueDate ?? "");
  const preview = buildTaskLogLine(project, { ...task, title: title.trim() || task.title }, logNote);

  async function patch(body: Record<string, unknown>) {
    const result = await send<{ task: BoardTask }>(`/api/tasks/${task.id}`, "PATCH", body);
    onChange(result.task);
    return result.task;
  }

  async function saveDetails() {
    setBusy("save");
    setMessage(null);
    try {
      await patch({ title, description, dueDate: dueDate || null });
      setMessage({ kind: "ok", text: "Saved." });
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "Could not save." });
    } finally {
      setBusy(null);
    }
  }

  async function updateChecklist(checklist: ChecklistItem[]) {
    const previous = task;
    onChange({ ...task, checklist });
    try {
      await patch({ checklist });
    } catch (err) {
      onChange(previous);
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "Could not update the checklist." });
    }
  }

  async function logToDay() {
    setBusy("log");
    setMessage(null);
    try {
      if (dirty) await patch({ title, description, dueDate: dueDate || null });
      const result = await send<{ task: BoardTask }>(`/api/tasks/${task.id}/log`, "POST", { workDate: logDate, note: logNote });
      onChange(result.task);
      setLogNote("");
      setMessage({ kind: "ok", text: "Added to your logbook note.", date: logDate });
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "Could not add to the logbook." });
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    setBusy("delete");
    try {
      await send(`/api/tasks/${task.id}`, "DELETE");
      onDelete();
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "Could not delete." });
      setBusy(null);
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/30"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-label={`Task: ${task.title}`}
        initial={{ x: 40 }}
        animate={{ x: 0 }}
        exit={{ x: 40 }}
        transition={{ type: "spring", stiffness: 380, damping: 34 }}
        onClick={(event) => event.stopPropagation()}
        className="h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <input
            aria-label="Task title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={200}
            className="w-full rounded-xl border border-transparent px-2 py-1 text-lg font-bold text-slate-900 outline-none hover:border-slate-200 focus:border-brand"
          />
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100">
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5" role="group" aria-label="Move to column">
          {TASK_COLUMNS.map((column) => (
            <button
              key={column}
              type="button"
              onClick={() => onMove(column)}
              aria-pressed={task.column === column}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                task.column === column ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {TASK_COLUMN_LABELS[column]}
            </button>
          ))}
        </div>

        <label className="mt-5 block text-xs font-bold uppercase tracking-wider text-slate-500" htmlFor="task-description">
          Notes
        </label>
        <textarea
          id="task-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Commands used, IP plan, links, what went wrong…"
          rows={4}
          maxLength={4000}
          className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-brand focus:bg-white"
        />

        <label className="mt-4 block text-xs font-bold uppercase tracking-wider text-slate-500" htmlFor="task-due">
          Due date
        </label>
        <input
          id="task-due"
          type="date"
          value={dueDate}
          onChange={(event) => setDueDate(event.target.value)}
          className="mt-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-brand focus:bg-white"
        />

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={saveDetails}
            disabled={!dirty || busy !== null || !title.trim()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-40 min-h-[40px]"
          >
            {busy === "save" && <Loader2 className="size-3.5 animate-spin" />} Save changes
          </button>
        </div>

        <div className="mt-6">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Checklist {task.checklist.length > 0 && `(${task.checklist.filter((item) => item.done).length}/${task.checklist.length})`}
          </p>
          <ul className="mt-2 space-y-1.5">
            {task.checklist.map((item) => (
              <li key={item.id} className="group flex items-center gap-2">
                <button
                  type="button"
                  aria-label={item.done ? `Untick ${item.text}` : `Tick ${item.text}`}
                  onClick={() =>
                    updateChecklist(task.checklist.map((step) => (step.id === item.id ? { ...step, done: !step.done } : step)))
                  }
                  className={`inline-flex size-5 shrink-0 items-center justify-center rounded-md border ${
                    item.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white"
                  }`}
                >
                  {item.done && <Check className="size-3.5" />}
                </button>
                <span className={`flex-1 text-sm ${item.done ? "text-slate-400 line-through" : "text-slate-700"}`}>{item.text}</span>
                <button
                  type="button"
                  aria-label={`Remove ${item.text}`}
                  onClick={() => updateChecklist(task.checklist.filter((step) => step.id !== item.id))}
                  className="rounded-md p-1 text-slate-400 opacity-0 hover:text-red-600 group-hover:opacity-100 focus:opacity-100"
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
          <form
            className="mt-2 flex items-center gap-1.5"
            onSubmit={(event) => {
              event.preventDefault();
              const text = newStep.trim();
              if (!text) return;
              setNewStep("");
              void updateChecklist([...task.checklist, { id: crypto.randomUUID(), text, done: false }]);
            }}
          >
            <input
              aria-label="New checklist step"
              value={newStep}
              onChange={(event) => setNewStep(event.target.value)}
              placeholder="Add a step"
              maxLength={200}
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-brand focus:bg-white"
            />
            <button type="submit" aria-label="Add step" className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50">
              <Plus className="size-4" />
            </button>
          </form>
        </div>

        <section className="mt-7 rounded-2xl border border-sky-100 bg-sky-50/60 p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <BookOpenCheck className="size-4 text-brand" /> Add to logbook
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Adds this line to the raw note for the chosen day. Format and save it from the entry page as usual.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label htmlFor="log-date" className="text-xs font-semibold text-slate-600">Day</label>
            <input
              id="log-date"
              type="date"
              value={logDate}
              min={programmeStartDate}
              max={today}
              onChange={(event) => setLogDate(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold outline-none focus:border-brand"
            />
          </div>
          <textarea
            aria-label="Extra detail for the logbook"
            value={logNote}
            onChange={(event) => setLogNote(event.target.value)}
            placeholder="Optional: what you actually did or learned (e.g. fixed native VLAN mismatch on trunk)"
            rows={2}
            maxLength={1000}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <p className="mt-2 rounded-xl bg-white px-3 py-2 text-xs leading-5 text-slate-700">
            <span className="font-semibold text-slate-500">Preview: </span>
            {preview}
          </p>
          <button
            type="button"
            onClick={logToDay}
            disabled={busy !== null || !logDate}
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-strong disabled:opacity-50 min-h-[40px]"
          >
            {busy === "log" ? <Loader2 className="size-3.5 animate-spin" /> : <BookOpenCheck className="size-3.5" />} Add to{" "}
            {logDate === today ? "today's" : "that day's"} note
          </button>
          {task.lastLoggedOn && (
            <p className="mt-2 text-[11px] text-slate-500">Last added to the logbook for {task.lastLoggedOn}.</p>
          )}
        </section>

        {message && (
          <div
            className={`mt-4 rounded-xl px-3 py-2 text-xs font-medium ${
              message.kind === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"
            }`}
          >
            {message.text}{" "}
            {message.date && (
              <Link href={`/dashboard/today?date=${message.date}` as Route} className="font-semibold underline">
                Open entry
              </Link>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={remove}
          disabled={busy !== null}
          className="mt-8 inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
        >
          <Trash2 className="size-3.5" /> Delete task
        </button>
      </motion.aside>
    </motion.div>
  );
}

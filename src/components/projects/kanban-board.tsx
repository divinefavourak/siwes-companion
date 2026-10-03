"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, BookOpenCheck, CalendarClock, ListChecks, Pencil, Plus, Trash2 } from "lucide-react";
import {
  PROJECT_KINDS,
  PROJECT_KIND_LABELS,
  TASK_COLUMNS,
  TASK_COLUMN_LABELS,
  type BoardProject,
  type BoardTask,
  type ProjectKind,
  type TaskColumn
} from "@/src/core/projects/types";
import { planTaskMove } from "@/src/core/projects/project-service";
import { ProjectKindIcon } from "@/src/components/projects/project-kind-icon";
import { TaskPanel } from "@/src/components/projects/task-panel";

const COLUMN_STYLES: Record<TaskColumn, { dot: string; ring: string }> = {
  BACKLOG: { dot: "bg-slate-400", ring: "ring-slate-300" },
  IN_PROGRESS: { dot: "bg-sky-500", ring: "ring-sky-300" },
  BLOCKED: { dot: "bg-amber-500", ring: "ring-amber-300" },
  DONE: { dot: "bg-emerald-500", ring: "ring-emerald-300" }
};

type ApiResult<T> = T & { error?: { message?: string } };

async function api<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
  const payload = (await response.json()) as ApiResult<T>;
  if (!response.ok) throw new Error(payload.error?.message ?? "Something went wrong. Try again.");
  return payload;
}

function applyMove(tasks: BoardTask[], taskId: string, column: TaskColumn, position: number) {
  const placements = new Map(planTaskMove(tasks, taskId, column, position).map((item) => [item.id, item]));
  return tasks.map((task) => {
    const placement = placements.get(task.id);
    return placement ? { ...task, column: placement.column, position: placement.position, completedAt: placement.completedAt } : task;
  });
}

export function KanbanBoard({
  project: initialProject,
  initialTasks,
  today,
  programmeStartDate
}: {
  project: BoardProject;
  initialTasks: BoardTask[];
  today: string;
  programmeStartDate: string;
}) {
  const router = useRouter();
  const [project, setProject] = useState(initialProject);
  const [tasks, setTasks] = useState(initialTasks);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ column: TaskColumn; index: number } | null>(null);
  const [drafts, setDrafts] = useState<Record<TaskColumn, string>>({ BACKLOG: "", IN_PROGRESS: "", BLOCKED: "", DONE: "" });
  const [editingProject, setEditingProject] = useState(false);
  const [error, setError] = useState("");

  const columnTasks = (column: TaskColumn) =>
    tasks.filter((task) => task.column === column).sort((a, b) => a.position - b.position);
  const openTask = tasks.find((task) => task.id === openTaskId) ?? null;

  async function move(taskId: string, column: TaskColumn, position: number) {
    const previous = tasks;
    setTasks(applyMove(tasks, taskId, column, position));
    setError("");
    try {
      const result = await api<{ tasks: BoardTask[] }>(`/api/tasks/${taskId}/move`, {
        method: "POST",
        body: JSON.stringify({ column, position })
      });
      setTasks(result.tasks);
    } catch (err) {
      setTasks(previous);
      setError(err instanceof Error ? err.message : "Could not move the task.");
    }
  }

  async function addTask(column: TaskColumn) {
    const title = drafts[column].trim();
    if (!title) return;
    setDrafts((current) => ({ ...current, [column]: "" }));
    setError("");
    try {
      const result = await api<{ task: BoardTask }>(`/api/projects/${project.id}/tasks`, {
        method: "POST",
        body: JSON.stringify({ title, column })
      });
      setTasks((current) => [...current, result.task]);
    } catch (err) {
      setDrafts((current) => ({ ...current, [column]: title }));
      setError(err instanceof Error ? err.message : "Could not add the task.");
    }
  }

  async function saveProject(form: { name: string; description: string; kind: ProjectKind }) {
    setError("");
    try {
      const result = await api<{ project: BoardProject }>(`/api/projects/${project.id}`, {
        method: "PATCH",
        body: JSON.stringify(form)
      });
      setProject(result.project);
      setEditingProject(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the project.");
    }
  }

  async function deleteProject() {
    if (!window.confirm(`Delete "${project.name}" and all its tasks? Logbook entries you already created stay.`)) return;
    try {
      await api(`/api/projects/${project.id}`, { method: "DELETE" });
      router.push("/dashboard/projects" as Route);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the project.");
    }
  }

  function onDrop(column: TaskColumn) {
    if (dragId && dropTarget) {
      // The drop index counts the dragged card; planTaskMove expects it removed first.
      const currentIndex = columnTasks(column).findIndex((task) => task.id === dragId);
      const index = currentIndex !== -1 && currentIndex < dropTarget.index ? dropTarget.index - 1 : dropTarget.index;
      if (currentIndex !== index) void move(dragId, column, index);
    }
    setDragId(null);
    setDropTarget(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={"/dashboard/projects" as Route}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="size-3.5" /> All projects
        </Link>
        {editingProject ? (
          <ProjectEditor project={project} onCancel={() => setEditingProject(false)} onSave={saveProject} />
        ) : (
          <div className="mt-3 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div className="flex items-start gap-3">
              <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-brand">
                <ProjectKindIcon kind={project.kind} className="size-6" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">{PROJECT_KIND_LABELS[project.kind]}</p>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">{project.name}</h1>
                {project.description && <p className="mt-1 max-w-2xl text-sm text-slate-600">{project.description}</p>}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditingProject(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 min-h-[40px]"
              >
                <Pencil className="size-3.5" /> Edit
              </button>
              <button
                type="button"
                onClick={deleteProject}
                className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 min-h-[40px]"
              >
                <Trash2 className="size-3.5" /> Delete
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-900">{error}</div>
      )}

      <div className="-mx-4 overflow-x-auto px-4 pb-2">
        <div className="grid min-w-[1000px] grid-cols-4 gap-4">
          {TASK_COLUMNS.map((column) => {
            const list = columnTasks(column);
            const isTarget = dragId !== null && dropTarget?.column === column;
            return (
              <section
                key={column}
                aria-label={TASK_COLUMN_LABELS[column]}
                onDragOver={(event) => {
                  event.preventDefault();
                  if (dropTarget?.column !== column) setDropTarget({ column, index: list.length });
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  onDrop(column);
                }}
                className={`flex min-h-[320px] flex-col rounded-[22px] border bg-slate-50/80 p-3 transition ${
                  isTarget ? `border-transparent ring-2 ${COLUMN_STYLES[column].ring}` : "border-slate-200/80"
                }`}
              >
                <header className="flex items-center justify-between px-1.5 pb-3 pt-1">
                  <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600">
                    <span className={`size-2 rounded-full ${COLUMN_STYLES[column].dot}`} />
                    {TASK_COLUMN_LABELS[column]}
                  </span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-slate-500">{list.length}</span>
                </header>

                <div className="flex flex-1 flex-col gap-2">
                  <AnimatePresence initial={false}>
                    {list.map((task, index) => (
                      <motion.div key={task.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        {isTarget && dropTarget?.index === index && <div className="mb-2 h-1 rounded-full bg-brand/60" />}
                        <TaskCard
                          task={task}
                          today={today}
                          dragging={dragId === task.id}
                          onOpen={() => setOpenTaskId(task.id)}
                          onDragStart={() => setDragId(task.id)}
                          onDragEnd={() => {
                            setDragId(null);
                            setDropTarget(null);
                          }}
                          onDragOver={(after) => setDropTarget({ column, index: after ? index + 1 : index })}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {isTarget && dropTarget?.index === list.length && <div className="h-1 rounded-full bg-brand/60" />}
                </div>

                <form
                  className="mt-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void addTask(column);
                  }}
                >
                  <div className="flex items-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-white px-2.5 focus-within:border-brand">
                    <Plus className="size-3.5 shrink-0 text-slate-400" />
                    <input
                      aria-label={`Add task to ${TASK_COLUMN_LABELS[column]}`}
                      value={drafts[column]}
                      onChange={(event) => setDrafts((current) => ({ ...current, [column]: event.target.value }))}
                      placeholder="Add a task"
                      maxLength={200}
                      className="w-full bg-transparent py-2 text-xs outline-none placeholder:text-slate-400"
                    />
                  </div>
                </form>
              </section>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {openTask && (
          <TaskPanel
            key={openTask.id}
            task={openTask}
            project={project}
            today={today}
            programmeStartDate={programmeStartDate}
            onClose={() => setOpenTaskId(null)}
            onChange={(updated) => setTasks((current) => current.map((task) => (task.id === updated.id ? updated : task)))}
            onMove={(column) => move(openTask.id, column, columnTasks(column).filter((task) => task.id !== openTask.id).length)}
            onDelete={() => {
              setTasks((current) => current.filter((task) => task.id !== openTask.id));
              setOpenTaskId(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function TaskCard({
  task,
  today,
  dragging,
  onOpen,
  onDragStart,
  onDragEnd,
  onDragOver
}: {
  task: BoardTask;
  today: string;
  dragging: boolean;
  onOpen: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: (after: boolean) => void;
}) {
  const doneSteps = task.checklist.filter((item) => item.done).length;
  const overdue = task.dueDate !== null && task.column !== "DONE" && task.dueDate < today;
  return (
    <button
      type="button"
      draggable
      onClick={onOpen}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", task.id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onDragOver={(event) => {
        event.preventDefault();
        event.stopPropagation();
        const rect = event.currentTarget.getBoundingClientRect();
        onDragOver(event.clientY > rect.top + rect.height / 2);
      }}
      className={`w-full cursor-grab rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-sky-200 hover:shadow active:cursor-grabbing ${
        dragging ? "opacity-40" : ""
      }`}
    >
      <p className={`text-sm font-semibold leading-5 ${task.column === "DONE" ? "text-slate-500 line-through decoration-slate-300" : "text-slate-900"}`}>
        {task.title}
      </p>
      {(task.checklist.length > 0 || task.dueDate || task.lastLoggedOn) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
          {task.checklist.length > 0 && (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${
                doneSteps === task.checklist.length ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
              }`}
            >
              <ListChecks className="size-3" /> {doneSteps}/{task.checklist.length}
            </span>
          )}
          {task.dueDate && (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${
                overdue ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600"
              }`}
            >
              <CalendarClock className="size-3" />
              {new Date(`${task.dueDate}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}
            </span>
          )}
          {task.lastLoggedOn && (
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-brand">
              <BookOpenCheck className="size-3" /> Logged
            </span>
          )}
        </div>
      )}
    </button>
  );
}

function ProjectEditor({
  project,
  onSave,
  onCancel
}: {
  project: BoardProject;
  onSave: (form: { name: string; description: string; kind: ProjectKind }) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [kind, setKind] = useState<ProjectKind>(project.kind);
  const [saving, setSaving] = useState(false);

  return (
    <form
      className="mt-3 space-y-3 rounded-[24px] border border-slate-200 bg-white p-5 shadow-soft"
      onSubmit={async (event) => {
        event.preventDefault();
        setSaving(true);
        await onSave({ name, description, kind });
        setSaving(false);
      }}
    >
      <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr]">
        <input
          aria-label="Project name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={120}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-brand focus:bg-white"
        />
        <select
          aria-label="Project type"
          value={kind}
          onChange={(event) => setKind(event.target.value as ProjectKind)}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-brand"
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
        rows={2}
        maxLength={2000}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-brand focus:bg-white"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving || name.trim().length < 2}
          className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 min-h-[40px]"
        >
          Save
        </button>
        <button type="button" onClick={onCancel} className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 min-h-[40px]">
          Cancel
        </button>
      </div>
    </form>
  );
}

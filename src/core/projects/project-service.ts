import { z } from "zod";
import { AppError } from "@/src/core/shared/errors";
import { parseDateOnly, type DateOnly } from "@/src/core/shared/date";
import { assertLoggableWorkDate, captureDailyNote } from "@/src/core/entries/entry-service";
import type { Entry, EntryRepository } from "@/src/core/entries/types";
import type { Programme } from "@/src/core/siwes/types";
import {
  PROJECT_KINDS,
  TASK_COLUMNS,
  type BoardProject,
  type BoardTask,
  type ChecklistItem,
  type ProjectKind,
  type ProjectRepository,
  type TaskColumn,
  type TaskPlacement
} from "@/src/core/projects/types";

const MAX_NOTE_LENGTH = 5000;

const dateOnlySchema = z.string().refine((value) => {
  try {
    parseDateOnly(value);
    return true;
  } catch {
    return false;
  }
}, "Use YYYY-MM-DD");

const checklistSchema = z
  .array(
    z.object({
      id: z.string().min(1).max(64),
      text: z.string().trim().min(1).max(200),
      done: z.boolean()
    })
  )
  .max(30);

const projectFieldsSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).nullable().optional(),
  kind: z.enum(PROJECT_KINDS)
});

const taskFieldsSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(4000).nullable().optional(),
  checklist: checklistSchema,
  dueDate: dateOnlySchema.nullable().optional()
});

function validate<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, input: unknown, message: string): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new AppError("VALIDATION_ERROR", message, { issues: parsed.error.issues });
  return parsed.data;
}

function emptyToNull(value: string | null | undefined) {
  return value === undefined ? undefined : value?.trim() ? value.trim() : null;
}

const STARTER_STEPS: Record<ProjectKind, string[]> = {
  CISCO_LAB: ["Draw the topology", "Configure devices", "Verify connectivity (ping / show commands)", "Save running-config and screenshots"],
  PHYSICAL_LAB: ["Gather equipment and tools", "Set up and cable", "Power on and test", "Label and document the setup"],
  PROGRAMMING: ["Implement", "Test", "Commit / open pull request"],
  RESEARCH: ["Find sources", "Take notes", "Summarise findings"],
  OTHER: []
};

export function starterChecklist(kind: ProjectKind, makeId: () => string = () => crypto.randomUUID()): ChecklistItem[] {
  return STARTER_STEPS[kind].map((text) => ({ id: makeId(), text, done: false }));
}

export async function createProject(
  repository: ProjectRepository,
  input: { userId: string; programmeId: string; name: string; description?: string | null; kind?: ProjectKind }
): Promise<BoardProject> {
  const data = validate(projectFieldsSchema, { ...input, kind: input.kind ?? "OTHER" }, "Project details are invalid");
  return repository.createProject({
    userId: input.userId,
    programmeId: input.programmeId,
    name: data.name,
    description: emptyToNull(data.description) ?? null,
    kind: data.kind
  });
}

export async function updateProject(
  repository: ProjectRepository,
  input: { userId: string; projectId: string; name?: string; description?: string | null; kind?: ProjectKind }
): Promise<BoardProject> {
  const data = validate(projectFieldsSchema.partial(), input, "Project details are invalid");
  await requireProject(repository, input.userId, input.projectId);
  return repository.updateProject(input.userId, input.projectId, {
    name: data.name,
    description: emptyToNull(data.description),
    kind: data.kind
  });
}

async function requireProject(repository: ProjectRepository, userId: string, projectId: string) {
  const project = await repository.findProject(userId, projectId);
  if (!project) throw new AppError("NOT_FOUND", "Project not found");
  return project;
}

async function requireTask(repository: ProjectRepository, userId: string, taskId: string) {
  const task = await repository.findTask(userId, taskId);
  if (!task) throw new AppError("NOT_FOUND", "Task not found");
  return task;
}

export async function createTask(
  repository: ProjectRepository,
  input: {
    userId: string;
    projectId: string;
    title: string;
    description?: string | null;
    column?: TaskColumn;
    checklist?: ChecklistItem[];
    dueDate?: string | null;
  }
): Promise<BoardTask> {
  const project = await requireProject(repository, input.userId, input.projectId);
  const column = validate(z.enum(TASK_COLUMNS), input.column ?? "BACKLOG", "Unknown board column");
  const data = validate(
    taskFieldsSchema,
    { ...input, checklist: input.checklist ?? starterChecklist(project.kind) },
    "Task details are invalid"
  );
  return repository.createTask(input.userId, {
    projectId: project.id,
    title: data.title,
    description: emptyToNull(data.description) ?? null,
    column,
    checklist: data.checklist,
    dueDate: data.dueDate ? parseDateOnly(data.dueDate) : null
  });
}

export async function updateTask(
  repository: ProjectRepository,
  input: {
    userId: string;
    taskId: string;
    title?: string;
    description?: string | null;
    checklist?: ChecklistItem[];
    dueDate?: string | null;
  }
): Promise<BoardTask> {
  const data = validate(taskFieldsSchema.partial(), input, "Task details are invalid");
  await requireTask(repository, input.userId, input.taskId);
  return repository.updateTask(input.userId, input.taskId, {
    title: data.title,
    description: emptyToNull(data.description),
    checklist: data.checklist,
    dueDate: data.dueDate === undefined ? undefined : data.dueDate ? parseDateOnly(data.dueDate) : null
  });
}

/**
 * Works out the new column/position of every task affected by moving `taskId`
 * to `position` within `column`. Positions are renumbered 0..n-1 per column.
 */
export function planTaskMove(
  tasks: BoardTask[],
  taskId: string,
  column: TaskColumn,
  position: number,
  now: Date = new Date()
): TaskPlacement[] {
  const moving = tasks.find((task) => task.id === taskId);
  if (!moving) throw new AppError("NOT_FOUND", "Task not found");

  const ordered = (col: TaskColumn) =>
    tasks
      .filter((task) => task.column === col && task.id !== taskId)
      .sort((a, b) => a.position - b.position);

  const target = ordered(column);
  const index = Math.max(0, Math.min(Math.trunc(position), target.length));
  target.splice(index, 0, moving);

  const affected = new Map<TaskColumn, BoardTask[]>([[column, target]]);
  if (moving.column !== column) affected.set(moving.column, ordered(moving.column));

  const placements: TaskPlacement[] = [];
  for (const [col, list] of affected) {
    list.forEach((task, i) => {
      const completedAt =
        col === "DONE" ? (task.column === "DONE" && task.completedAt ? task.completedAt : now.toISOString()) : null;
      if (task.column !== col || task.position !== i || task.completedAt !== completedAt) {
        placements.push({ id: task.id, column: col, position: i, completedAt });
      }
    });
  }
  return placements;
}

export async function moveTask(
  repository: ProjectRepository,
  input: { userId: string; taskId: string; column: TaskColumn; position: number }
): Promise<BoardTask[]> {
  const column = validate(z.enum(TASK_COLUMNS), input.column, "Unknown board column");
  const position = validate(z.number().int().min(0).max(10_000), input.position, "Invalid position");
  const task = await requireTask(repository, input.userId, input.taskId);
  const tasks = await repository.listTasks(input.userId, task.projectId);
  const placements = planTaskMove(tasks, task.id, column, position);
  if (placements.length > 0) await repository.applyPlacements(input.userId, task.projectId, placements);
  return repository.listTasks(input.userId, task.projectId);
}

const LOG_VERBS: Record<TaskColumn, string> = {
  BACKLOG: "Planned",
  IN_PROGRESS: "Worked on",
  BLOCKED: "Blocked on",
  DONE: "Completed"
};

/**
 * Builds the line added to a day's raw note. It only restates what the student
 * entered on the card (title, ticked steps, their own note) so the AI formatter
 * stays grounded in real work.
 */
export function buildTaskLogLine(project: Pick<BoardProject, "name">, task: BoardTask, note?: string | null): string {
  const parts = [`[${project.name}] ${LOG_VERBS[task.column]}: ${task.title}.`];
  const done = task.checklist.filter((item) => item.done).map((item) => item.text);
  if (done.length > 0) parts.push(`Steps done: ${done.join("; ")}.`);
  const trimmed = note?.trim();
  if (trimmed) parts.push(trimmed.endsWith(".") ? trimmed : `${trimmed}.`);
  return parts.join(" ");
}

export async function logTaskToDay(
  repositories: { projects: ProjectRepository; entries: EntryRepository },
  input: { userId: string; programme: Programme; taskId: string; workDate: DateOnly; today: DateOnly; note?: string | null }
): Promise<{ entry: Entry; task: BoardTask; line: string }> {
  assertLoggableWorkDate(input.programme, input.workDate, input.today);
  const note = validate(z.string().max(1000).nullable().optional(), input.note, "Note is too long");
  const task = await requireTask(repositories.projects, input.userId, input.taskId);
  const project = await requireProject(repositories.projects, input.userId, task.projectId);
  if (project.programmeId !== input.programme.id) throw new AppError("NOT_FOUND", "Project not found");

  const line = buildTaskLogLine(project, task, note);
  const existing = await repositories.entries.findOwnedByDate(input.userId, input.programme.id, input.workDate);
  if (existing?.rawText.includes(line)) {
    throw new AppError("CONFLICT", "This task update is already in that day's note");
  }
  const rawText = existing?.rawText.trim() ? `${existing.rawText.trimEnd()}\n${line}` : line;
  if (rawText.length > MAX_NOTE_LENGTH) {
    throw new AppError("VALIDATION_ERROR", "That day's note is full. Shorten it before adding more.");
  }

  const entry = await captureDailyNote(repositories.entries, {
    userId: input.userId,
    programmeId: input.programme.id,
    workDate: input.workDate,
    rawText,
    source: existing?.rawSource ?? "WEB"
  });
  const updated = await repositories.projects.updateTask(input.userId, task.id, { lastLoggedOn: input.workDate });
  return { entry, task: updated, line };
}

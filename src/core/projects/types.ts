import type { DateOnly } from "@/src/core/shared/date";

export const PROJECT_KINDS = ["CISCO_LAB", "PHYSICAL_LAB", "PROGRAMMING", "RESEARCH", "OTHER"] as const;
export type ProjectKind = (typeof PROJECT_KINDS)[number];

export const TASK_COLUMNS = ["BACKLOG", "IN_PROGRESS", "BLOCKED", "DONE"] as const;
export type TaskColumn = (typeof TASK_COLUMNS)[number];

export const PROJECT_KIND_LABELS: Record<ProjectKind, string> = {
  CISCO_LAB: "Cisco / networking lab",
  PHYSICAL_LAB: "Physical lab setup",
  PROGRAMMING: "Programming project",
  RESEARCH: "Research / study",
  OTHER: "Other"
};

export const TASK_COLUMN_LABELS: Record<TaskColumn, string> = {
  BACKLOG: "Backlog",
  IN_PROGRESS: "In progress",
  BLOCKED: "Blocked",
  DONE: "Done"
};

export type ChecklistItem = { id: string; text: string; done: boolean };

export type BoardProject = {
  id: string;
  programmeId: string;
  name: string;
  description: string | null;
  kind: ProjectKind;
  createdAt: string;
  taskCounts: Record<TaskColumn, number>;
};

export type BoardTask = {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  column: TaskColumn;
  position: number;
  checklist: ChecklistItem[];
  dueDate: DateOnly | null;
  completedAt: string | null;
  lastLoggedOn: DateOnly | null;
};

export type CreateProjectInput = {
  userId: string;
  programmeId: string;
  name: string;
  description?: string | null;
  kind: ProjectKind;
};

export type ProjectPatch = { name?: string; description?: string | null; kind?: ProjectKind };

export type CreateTaskInput = {
  projectId: string;
  title: string;
  description?: string | null;
  column: TaskColumn;
  checklist: ChecklistItem[];
  dueDate?: DateOnly | null;
};

export type TaskPatch = {
  title?: string;
  description?: string | null;
  checklist?: ChecklistItem[];
  dueDate?: DateOnly | null;
  lastLoggedOn?: DateOnly | null;
};

/** Position/column changes produced by a move; applied as one batch. */
export type TaskPlacement = { id: string; column: TaskColumn; position: number; completedAt: string | null };

export interface ProjectRepository {
  listProjects(userId: string, programmeId: string): Promise<BoardProject[]>;
  findProject(userId: string, projectId: string): Promise<BoardProject | null>;
  createProject(input: CreateProjectInput): Promise<BoardProject>;
  updateProject(userId: string, projectId: string, patch: ProjectPatch): Promise<BoardProject>;
  deleteProject(userId: string, projectId: string): Promise<void>;
  listTasks(userId: string, projectId: string): Promise<BoardTask[]>;
  findTask(userId: string, taskId: string): Promise<BoardTask | null>;
  /** Appends the task to the end of its column. */
  createTask(userId: string, input: CreateTaskInput): Promise<BoardTask>;
  updateTask(userId: string, taskId: string, patch: TaskPatch): Promise<BoardTask>;
  applyPlacements(userId: string, projectId: string, placements: TaskPlacement[]): Promise<void>;
  deleteTask(userId: string, taskId: string): Promise<void>;
}

import { AppError } from "@/src/core/shared/errors";
import {
  TASK_COLUMNS,
  type BoardProject,
  type BoardTask,
  type CreateProjectInput,
  type CreateTaskInput,
  type ProjectPatch,
  type ProjectRepository,
  type TaskColumn,
  type TaskPatch,
  type TaskPlacement
} from "@/src/core/projects/types";

type StoredProject = Omit<BoardProject, "taskCounts"> & { userId: string; updatedAt: number };
type DemoProjectState = { projects: StoredProject[]; tasks: BoardTask[] };

const globalForProjects = globalThis as typeof globalThis & { __siwesDemoProjects?: DemoProjectState };
const state = globalForProjects.__siwesDemoProjects ?? { projects: [], tasks: [] };
globalForProjects.__siwesDemoProjects = state;

export class DemoProjectRepository implements ProjectRepository {
  constructor(private readonly store: DemoProjectState = state) {}

  private withCounts(project: StoredProject): BoardProject {
    const taskCounts = Object.fromEntries(TASK_COLUMNS.map((column) => [column, 0])) as Record<TaskColumn, number>;
    for (const task of this.store.tasks) if (task.projectId === project.id) taskCounts[task.column] += 1;
    return {
      id: project.id,
      programmeId: project.programmeId,
      name: project.name,
      description: project.description,
      kind: project.kind,
      createdAt: project.createdAt,
      taskCounts
    };
  }

  private owned(userId: string, projectId: string) {
    const project = this.store.projects.find((item) => item.id === projectId && item.userId === userId);
    if (!project) throw new AppError("NOT_FOUND", "Project not found");
    return project;
  }

  private assertUniqueName(project: { id?: string; userId: string; programmeId: string; name: string }) {
    const clash = this.store.projects.some(
      (item) =>
        item.id !== project.id &&
        item.userId === project.userId &&
        item.programmeId === project.programmeId &&
        item.name.toLowerCase() === project.name.toLowerCase()
    );
    if (clash) throw new AppError("CONFLICT", "You already have a project with that name");
  }

  async listProjects(userId: string, programmeId: string) {
    return this.store.projects
      .filter((project) => project.userId === userId && project.programmeId === programmeId)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((project) => this.withCounts(project));
  }

  async findProject(userId: string, projectId: string) {
    const project = this.store.projects.find((item) => item.id === projectId && item.userId === userId);
    return project ? this.withCounts(project) : null;
  }

  async createProject(input: CreateProjectInput) {
    this.assertUniqueName(input);
    const project: StoredProject = {
      id: crypto.randomUUID(),
      userId: input.userId,
      programmeId: input.programmeId,
      name: input.name,
      description: input.description ?? null,
      kind: input.kind,
      createdAt: new Date().toISOString(),
      updatedAt: Date.now()
    };
    this.store.projects.push(project);
    return this.withCounts(project);
  }

  async updateProject(userId: string, projectId: string, patch: ProjectPatch) {
    const project = this.owned(userId, projectId);
    if (patch.name !== undefined) this.assertUniqueName({ ...project, name: patch.name });
    if (patch.name !== undefined) project.name = patch.name;
    if (patch.description !== undefined) project.description = patch.description;
    if (patch.kind !== undefined) project.kind = patch.kind;
    project.updatedAt = Date.now();
    return this.withCounts(project);
  }

  async deleteProject(userId: string, projectId: string) {
    this.owned(userId, projectId);
    this.store.projects = this.store.projects.filter((item) => item.id !== projectId);
    this.store.tasks = this.store.tasks.filter((task) => task.projectId !== projectId);
  }

  async listTasks(userId: string, projectId: string) {
    this.owned(userId, projectId);
    return this.store.tasks
      .filter((task) => task.projectId === projectId)
      .sort((a, b) => TASK_COLUMNS.indexOf(a.column) - TASK_COLUMNS.indexOf(b.column) || a.position - b.position)
      .map((task) => ({ ...task, checklist: task.checklist.map((item) => ({ ...item })) }));
  }

  async findTask(userId: string, taskId: string) {
    const task = this.store.tasks.find((item) => item.id === taskId);
    if (!task || !this.store.projects.some((project) => project.id === task.projectId && project.userId === userId)) return null;
    return { ...task, checklist: task.checklist.map((item) => ({ ...item })) };
  }

  async createTask(userId: string, input: CreateTaskInput) {
    const project = this.owned(userId, input.projectId);
    const inColumn = this.store.tasks.filter((task) => task.projectId === input.projectId && task.column === input.column);
    const task: BoardTask = {
      id: crypto.randomUUID(),
      projectId: input.projectId,
      title: input.title,
      description: input.description ?? null,
      column: input.column,
      position: inColumn.reduce((max, item) => Math.max(max, item.position), -1) + 1,
      checklist: input.checklist,
      dueDate: input.dueDate ?? null,
      completedAt: input.column === "DONE" ? new Date().toISOString() : null,
      lastLoggedOn: null
    };
    this.store.tasks.push(task);
    project.updatedAt = Date.now();
    return { ...task };
  }

  async updateTask(userId: string, taskId: string, patch: TaskPatch) {
    if (!(await this.findTask(userId, taskId))) throw new AppError("NOT_FOUND", "Task not found");
    const task = this.store.tasks.find((item) => item.id === taskId)!;
    for (const [key, value] of Object.entries(patch)) {
      if (value !== undefined) Object.assign(task, { [key]: value });
    }
    return { ...task };
  }

  async applyPlacements(userId: string, projectId: string, placements: TaskPlacement[]) {
    const project = this.owned(userId, projectId);
    for (const placement of placements) {
      const task = this.store.tasks.find((item) => item.id === placement.id && item.projectId === projectId);
      if (task) Object.assign(task, { column: placement.column, position: placement.position, completedAt: placement.completedAt });
    }
    project.updatedAt = Date.now();
  }

  async deleteTask(userId: string, taskId: string) {
    if (!(await this.findTask(userId, taskId))) throw new AppError("NOT_FOUND", "Task not found");
    this.store.tasks = this.store.tasks.filter((task) => task.id !== taskId);
  }
}

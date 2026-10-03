import { Prisma, type Project, type ProjectTask } from "@prisma/client";
import { prisma } from "@/src/lib/prisma";
import { AppError } from "@/src/core/shared/errors";
import { toDateOnly } from "@/src/core/shared/date";
import {
  TASK_COLUMNS,
  type BoardProject,
  type BoardTask,
  type ChecklistItem,
  type CreateProjectInput,
  type CreateTaskInput,
  type ProjectPatch,
  type ProjectRepository,
  type TaskColumn,
  type TaskPatch,
  type TaskPlacement
} from "@/src/core/projects/types";

function dateValue(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function toChecklist(value: Prisma.JsonValue): ChecklistItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const { id, text, done } = item as Record<string, unknown>;
    return typeof id === "string" && typeof text === "string" ? [{ id, text, done: done === true }] : [];
  });
}

function mapProject(row: Project & { tasks: { column: TaskColumn }[] }): BoardProject {
  const taskCounts = Object.fromEntries(TASK_COLUMNS.map((column) => [column, 0])) as Record<TaskColumn, number>;
  for (const task of row.tasks) taskCounts[task.column] += 1;
  return {
    id: row.id,
    programmeId: row.programmeId,
    name: row.name,
    description: row.description,
    kind: row.kind,
    createdAt: row.createdAt.toISOString(),
    taskCounts
  };
}

function mapTask(row: ProjectTask): BoardTask {
  return {
    id: row.id,
    projectId: row.projectId,
    title: row.title,
    description: row.description,
    column: row.column,
    position: row.position,
    checklist: toChecklist(row.checklist),
    dueDate: row.dueDate ? toDateOnly(row.dueDate) : null,
    completedAt: row.completedAt?.toISOString() ?? null,
    lastLoggedOn: row.lastLoggedOn ? toDateOnly(row.lastLoggedOn) : null
  };
}

const withCounts = { tasks: { select: { column: true } } } satisfies Prisma.ProjectInclude;

function rethrowDuplicateName(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    throw new AppError("CONFLICT", "You already have a project with that name");
  }
  throw error;
}

export class PrismaProjectRepository implements ProjectRepository {
  async listProjects(userId: string, programmeId: string) {
    const rows = await prisma.project.findMany({
      where: { programmeId, programme: { userId } },
      include: withCounts,
      orderBy: { updatedAt: "desc" }
    });
    return rows.map(mapProject);
  }

  async findProject(userId: string, projectId: string) {
    const row = await prisma.project.findFirst({ where: { id: projectId, programme: { userId } }, include: withCounts });
    return row ? mapProject(row) : null;
  }

  async createProject(input: CreateProjectInput) {
    const programme = await prisma.siwesProgramme.findFirst({ where: { id: input.programmeId, userId: input.userId }, select: { id: true } });
    if (!programme) throw new AppError("FORBIDDEN", "Programme not found");
    try {
      const row = await prisma.project.create({
        data: { programmeId: input.programmeId, name: input.name, description: input.description ?? null, kind: input.kind },
        include: withCounts
      });
      return mapProject(row);
    } catch (error) {
      rethrowDuplicateName(error);
    }
  }

  async updateProject(userId: string, projectId: string, patch: ProjectPatch) {
    await this.ownedProject(userId, projectId);
    try {
      const row = await prisma.project.update({ where: { id: projectId }, data: patch, include: withCounts });
      return mapProject(row);
    } catch (error) {
      rethrowDuplicateName(error);
    }
  }

  async deleteProject(userId: string, projectId: string) {
    await this.ownedProject(userId, projectId);
    await prisma.project.delete({ where: { id: projectId } });
  }

  async listTasks(userId: string, projectId: string) {
    const rows = await prisma.projectTask.findMany({
      where: { projectId, project: { programme: { userId } } },
      orderBy: [{ column: "asc" }, { position: "asc" }, { createdAt: "asc" }]
    });
    return rows.map(mapTask);
  }

  async findTask(userId: string, taskId: string) {
    const row = await prisma.projectTask.findFirst({ where: { id: taskId, project: { programme: { userId } } } });
    return row ? mapTask(row) : null;
  }

  async createTask(userId: string, input: CreateTaskInput) {
    await this.ownedProject(userId, input.projectId);
    const last = await prisma.projectTask.findFirst({
      where: { projectId: input.projectId, column: input.column },
      orderBy: { position: "desc" },
      select: { position: true }
    });
    const row = await prisma.projectTask.create({
      data: {
        projectId: input.projectId,
        title: input.title,
        description: input.description ?? null,
        column: input.column,
        position: (last?.position ?? -1) + 1,
        checklist: input.checklist as unknown as Prisma.InputJsonValue,
        dueDate: input.dueDate ? dateValue(input.dueDate) : null,
        completedAt: input.column === "DONE" ? new Date() : null
      }
    });
    await this.touchProject(input.projectId);
    return mapTask(row);
  }

  async updateTask(userId: string, taskId: string, patch: TaskPatch) {
    const owned = await this.findTask(userId, taskId);
    if (!owned) throw new AppError("NOT_FOUND", "Task not found");
    const row = await prisma.projectTask.update({
      where: { id: taskId },
      data: {
        title: patch.title,
        description: patch.description,
        checklist: patch.checklist === undefined ? undefined : (patch.checklist as unknown as Prisma.InputJsonValue),
        dueDate: patch.dueDate === undefined ? undefined : patch.dueDate ? dateValue(patch.dueDate) : null,
        lastLoggedOn: patch.lastLoggedOn === undefined ? undefined : patch.lastLoggedOn ? dateValue(patch.lastLoggedOn) : null
      }
    });
    await this.touchProject(row.projectId);
    return mapTask(row);
  }

  async applyPlacements(userId: string, projectId: string, placements: TaskPlacement[]) {
    await this.ownedProject(userId, projectId);
    await prisma.$transaction([
      ...placements.map((placement) =>
        prisma.projectTask.updateMany({
          where: { id: placement.id, projectId },
          data: {
            column: placement.column,
            position: placement.position,
            completedAt: placement.completedAt ? new Date(placement.completedAt) : null
          }
        })
      ),
      prisma.project.update({ where: { id: projectId }, data: { updatedAt: new Date() } })
    ]);
  }

  async deleteTask(userId: string, taskId: string) {
    const owned = await this.findTask(userId, taskId);
    if (!owned) throw new AppError("NOT_FOUND", "Task not found");
    await prisma.projectTask.delete({ where: { id: taskId } });
  }

  private async ownedProject(userId: string, projectId: string) {
    const project = await prisma.project.findFirst({ where: { id: projectId, programme: { userId } }, select: { id: true } });
    if (!project) throw new AppError("NOT_FOUND", "Project not found");
    return project;
  }

  private async touchProject(projectId: string) {
    await prisma.project.update({ where: { id: projectId }, data: { updatedAt: new Date() } });
  }
}

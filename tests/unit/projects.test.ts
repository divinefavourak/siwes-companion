import { describe, expect, it } from "vitest";
import { DemoProjectRepository } from "@/src/lib/demo-projects";
import { DemoEntryRepository } from "@/src/lib/demo-store";
import {
  buildTaskLogLine,
  createProject,
  createTask,
  logTaskToDay,
  moveTask,
  planTaskMove,
  starterChecklist,
  updateTask
} from "@/src/core/projects/project-service";
import type { BoardTask } from "@/src/core/projects/types";
import type { Programme } from "@/src/core/siwes/types";

const programme: Programme = {
  id: "demo-programme",
  userId: "demo-user",
  title: null,
  durationMonths: 3,
  institution: "Demo University",
  department: "Computer Science",
  level: "300",
  matricNumber: "CS/1",
  organization: "Demo Ltd",
  unit: "Networks",
  startDate: "2026-09-01",
  endDate: "2026-11-30",
  timezone: "Africa/Nairobi",
  workingWeekdays: [1, 2, 3, 4, 5],
  overrides: [],
  status: "ACTIVE"
} as Programme;

function freshRepo() {
  return new DemoProjectRepository({ projects: [], tasks: [] });
}

function task(id: string, column: BoardTask["column"], position: number): BoardTask {
  return { id, projectId: "p", title: id, description: null, column, position, checklist: [], dueDate: null, completedAt: null, lastLoggedOn: null };
}

describe("project boards", () => {
  it("creates projects, rejects duplicates and seeds starter checklists by kind", async () => {
    const repo = freshRepo();
    await expect(createProject(repo, { userId: "u", programmeId: "p", name: "x" })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    const project = await createProject(repo, { userId: "u", programmeId: "p", name: "CCNA Lab 4", kind: "CISCO_LAB" });
    await expect(createProject(repo, { userId: "u", programmeId: "p", name: "ccna lab 4" })).rejects.toMatchObject({ code: "CONFLICT" });

    const created = await createTask(repo, { userId: "u", projectId: project.id, title: "Inter-VLAN routing" });
    expect(created.column).toBe("BACKLOG");
    expect(created.checklist.map((item) => item.text)).toEqual(starterChecklist("CISCO_LAB").map((item) => item.text));
    const plain = await createTask(repo, { userId: "u", projectId: project.id, title: "Read docs", checklist: [] });
    expect(plain.position).toBe(1);

    await expect(createTask(repo, { userId: "other", projectId: project.id, title: "Nope" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(updateTask(repo, { userId: "u", taskId: created.id, dueDate: "2026-02-30" })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    const updated = await updateTask(repo, { userId: "u", taskId: created.id, dueDate: "2026-10-10", description: "  " });
    expect(updated.dueDate).toBe("2026-10-10");
    expect(updated.description).toBeNull();
    expect((await repo.findProject("u", project.id))?.taskCounts.BACKLOG).toBe(2);
  });

  it("plans moves with contiguous positions and completion stamps", () => {
    const tasks = [task("a", "BACKLOG", 0), task("b", "BACKLOG", 1), task("c", "BACKLOG", 2), task("d", "DONE", 0)];
    const now = new Date("2026-10-03T10:00:00Z");
    const toDone = planTaskMove(tasks, "b", "DONE", 0, now);
    expect(toDone).toEqual(
      expect.arrayContaining([
        { id: "b", column: "DONE", position: 0, completedAt: now.toISOString() },
        { id: "d", column: "DONE", position: 1, completedAt: now.toISOString() },
        { id: "c", column: "BACKLOG", position: 1, completedAt: null }
      ])
    );
    const reorder = planTaskMove(tasks, "a", "BACKLOG", 99, now);
    expect(reorder).toEqual([
      { id: "b", column: "BACKLOG", position: 0, completedAt: null },
      { id: "c", column: "BACKLOG", position: 1, completedAt: null },
      { id: "a", column: "BACKLOG", position: 2, completedAt: null }
    ]);
    expect(planTaskMove(tasks, "a", "BACKLOG", 0, now)).toEqual([]);
  });

  it("moves tasks through the repository and clears completion when reopened", async () => {
    const repo = freshRepo();
    const project = await createProject(repo, { userId: "u", programmeId: "p", name: "API", kind: "PROGRAMMING" });
    const first = await createTask(repo, { userId: "u", projectId: project.id, title: "Auth" });
    let tasks = await moveTask(repo, { userId: "u", taskId: first.id, column: "DONE", position: 0 });
    expect(tasks[0]).toMatchObject({ column: "DONE", position: 0 });
    expect(tasks[0].completedAt).not.toBeNull();
    tasks = await moveTask(repo, { userId: "u", taskId: first.id, column: "IN_PROGRESS", position: 0 });
    expect(tasks[0].completedAt).toBeNull();
    await expect(moveTask(repo, { userId: "u", taskId: first.id, column: "LATER" as never, position: 0 })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("builds grounded log lines and appends them to the day's raw note", async () => {
    const projects = freshRepo();
    const entries = new DemoEntryRepository();
    const project = await createProject(projects, { userId: "demo-user", programmeId: programme.id, name: "CCNA Lab 4", kind: "CISCO_LAB" });
    const created = await createTask(projects, { userId: "demo-user", projectId: project.id, title: "Configure trunk ports", column: "DONE" });
    const ticked = await updateTask(projects, {
      userId: "demo-user",
      taskId: created.id,
      checklist: created.checklist.map((item, index) => ({ ...item, done: index < 2 }))
    });
    expect(buildTaskLogLine(project, ticked, "fixed native VLAN mismatch")).toBe(
      "[CCNA Lab 4] Completed: Configure trunk ports. Steps done: Draw the topology; Configure devices. fixed native VLAN mismatch."
    );

    await entries.upsertRawNote({ userId: "demo-user", programmeId: programme.id, workDate: "2026-10-02", rawText: "Morning standup.", source: "WEB" });
    const result = await logTaskToDay({ projects, entries }, {
      userId: "demo-user", programme, taskId: created.id, workDate: "2026-10-02", today: "2026-10-03", note: "fixed native VLAN mismatch"
    });
    expect(result.entry.rawText).toBe(`Morning standup.\n${result.line}`);
    expect(result.task.lastLoggedOn).toBe("2026-10-02");

    await expect(logTaskToDay({ projects, entries }, {
      userId: "demo-user", programme, taskId: created.id, workDate: "2026-10-02", today: "2026-10-03", note: "fixed native VLAN mismatch"
    })).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(logTaskToDay({ projects, entries }, {
      userId: "demo-user", programme, taskId: created.id, workDate: "2026-10-04", today: "2026-10-03"
    })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});

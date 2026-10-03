import Link from "next/link";
import type { Route } from "next";
import { getViewer } from "@/src/lib/viewer";
import { getRepositories } from "@/src/adapters/web/repositories";
import { getProjectRepository } from "@/src/adapters/web/project-repositories";
import { PROJECT_KIND_LABELS, TASK_COLUMNS } from "@/src/core/projects/types";
import { ProjectKindIcon } from "@/src/components/projects/project-kind-icon";
import { NewProjectForm } from "@/src/components/projects/new-project-form";

export default async function ProjectsPage() {
  const viewer = await getViewer();
  if (!viewer) return null;
  const programme = await getRepositories().programmes.findActiveByUser(viewer.id);
  if (!programme) return <div className="rounded-3xl bg-white p-8">Create your SIWES programme first.</div>;
  const projects = await getProjectRepository().listProjects(viewer.id, programme.id);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">Personal work</p>
        <h1 className="mt-1 text-4xl font-bold tracking-tight text-ink">Projects &amp; Labs</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Track Cisco labs, physical lab setups and programming tasks on a kanban board. Boards are private to you.
          When you finish something worth recording, send it to that day&apos;s logbook note with one click.
        </p>
      </div>

      <NewProjectForm />

      {projects.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-sm font-medium text-slate-600">No projects yet. Create your first board above.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => {
            const total = TASK_COLUMNS.reduce((sum, column) => sum + project.taskCounts[column], 0);
            const done = project.taskCounts.DONE;
            const percent = total === 0 ? 0 : Math.round((done / total) * 100);
            return (
              <Link
                key={project.id}
                href={`/dashboard/projects/${project.id}` as Route}
                className="group flex flex-col rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-sky-200"
              >
                <div className="flex items-start gap-3">
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-brand">
                    <ProjectKindIcon kind={project.kind} className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900 group-hover:text-brand">{project.name}</p>
                    <p className="text-xs text-slate-400">{PROJECT_KIND_LABELS[project.kind]}</p>
                  </div>
                </div>
                {project.description && (
                  <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-600">{project.description}</p>
                )}
                <div className="mt-auto pt-4">
                  <div className="flex justify-between text-[11px] font-semibold text-slate-500">
                    <span>
                      {project.taskCounts.IN_PROGRESS} in progress
                      {project.taskCounts.BLOCKED > 0 && <span className="text-amber-700"> · {project.taskCounts.BLOCKED} blocked</span>}
                    </span>
                    <span>
                      {done}/{total} done
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

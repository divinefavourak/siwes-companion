import { notFound } from "next/navigation";
import { getViewer } from "@/src/lib/viewer";
import { getRepositories } from "@/src/adapters/web/repositories";
import { getProjectRepository } from "@/src/adapters/web/project-repositories";
import { dateFromTimestampInTimeZone } from "@/src/core/shared/date";
import { KanbanBoard } from "@/src/components/projects/kanban-board";

export default async function ProjectBoardPage({ params }: { params: Promise<{ projectId: string }> }) {
  const viewer = await getViewer();
  if (!viewer) return null;
  const programme = await getRepositories().programmes.findActiveByUser(viewer.id);
  if (!programme) return <div className="rounded-3xl bg-white p-8">Create your SIWES programme first.</div>;
  const { projectId } = await params;
  const repository = getProjectRepository();
  const project = await repository.findProject(viewer.id, projectId);
  if (!project || project.programmeId !== programme.id) notFound();
  const tasks = await repository.listTasks(viewer.id, project.id);
  const today = dateFromTimestampInTimeZone(new Date(), programme.timezone);
  const lastLoggableDay = today < programme.endDate ? today : programme.endDate;

  return (
    <KanbanBoard
      project={project}
      initialTasks={tasks}
      today={lastLoggableDay}
      programmeStartDate={programme.startDate}
    />
  );
}

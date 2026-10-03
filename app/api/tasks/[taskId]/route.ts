import { NextResponse } from "next/server";
import { updateTask } from "@/src/core/projects/project-service";
import { getProjectRepository } from "@/src/adapters/web/project-repositories";
import { projectContext } from "@/src/lib/project-api";
import { jsonError } from "@/src/lib/api";

type Params = { params: Promise<{ taskId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const context = await projectContext();
    if ("response" in context) return context.response;
    const { taskId } = await params;
    const body = await request.json();
    const task = await updateTask(getProjectRepository(), {
      userId: context.viewer.id,
      taskId,
      title: body.title,
      description: body.description,
      checklist: body.checklist,
      dueDate: body.dueDate
    });
    return NextResponse.json({ task });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const context = await projectContext();
    if ("response" in context) return context.response;
    const { taskId } = await params;
    await getProjectRepository().deleteTask(context.viewer.id, taskId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}

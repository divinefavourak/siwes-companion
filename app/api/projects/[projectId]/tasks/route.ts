import { NextResponse } from "next/server";
import { createTask } from "@/src/core/projects/project-service";
import { getProjectRepository } from "@/src/adapters/web/project-repositories";
import { projectContext } from "@/src/lib/project-api";
import { jsonError } from "@/src/lib/api";

type Params = { params: Promise<{ projectId: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const context = await projectContext();
    if ("response" in context) return context.response;
    const { projectId } = await params;
    const tasks = await getProjectRepository().listTasks(context.viewer.id, projectId);
    return NextResponse.json({ tasks });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const context = await projectContext();
    if ("response" in context) return context.response;
    const { projectId } = await params;
    const body = await request.json();
    const task = await createTask(getProjectRepository(), {
      userId: context.viewer.id,
      projectId,
      title: body.title,
      description: body.description,
      column: body.column,
      checklist: body.checklist,
      dueDate: body.dueDate
    });
    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

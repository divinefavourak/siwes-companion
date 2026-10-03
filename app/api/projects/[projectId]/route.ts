import { NextResponse } from "next/server";
import { updateProject } from "@/src/core/projects/project-service";
import { getProjectRepository } from "@/src/adapters/web/project-repositories";
import { projectContext } from "@/src/lib/project-api";
import { jsonError } from "@/src/lib/api";

type Params = { params: Promise<{ projectId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const context = await projectContext();
    if ("response" in context) return context.response;
    const { projectId } = await params;
    const body = await request.json();
    const project = await updateProject(getProjectRepository(), {
      userId: context.viewer.id,
      projectId,
      name: body.name,
      description: body.description,
      kind: body.kind
    });
    return NextResponse.json({ project });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const context = await projectContext();
    if ("response" in context) return context.response;
    const { projectId } = await params;
    await getProjectRepository().deleteProject(context.viewer.id, projectId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}

import { NextResponse } from "next/server";
import { createProject } from "@/src/core/projects/project-service";
import { getProjectRepository } from "@/src/adapters/web/project-repositories";
import { projectContext } from "@/src/lib/project-api";
import { jsonError } from "@/src/lib/api";

export async function GET() {
  try {
    const context = await projectContext();
    if ("response" in context) return context.response;
    const projects = await getProjectRepository().listProjects(context.viewer.id, context.programme.id);
    return NextResponse.json({ projects });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await projectContext();
    if ("response" in context) return context.response;
    const body = await request.json();
    const project = await createProject(getProjectRepository(), {
      userId: context.viewer.id,
      programmeId: context.programme.id,
      name: body.name,
      description: body.description,
      kind: body.kind
    });
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

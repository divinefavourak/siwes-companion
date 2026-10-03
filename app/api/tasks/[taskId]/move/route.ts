import { NextResponse } from "next/server";
import { moveTask } from "@/src/core/projects/project-service";
import { getProjectRepository } from "@/src/adapters/web/project-repositories";
import { projectContext } from "@/src/lib/project-api";
import { jsonError } from "@/src/lib/api";

export async function POST(request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const context = await projectContext();
    if ("response" in context) return context.response;
    const { taskId } = await params;
    const body = await request.json();
    const tasks = await moveTask(getProjectRepository(), {
      userId: context.viewer.id,
      taskId,
      column: body.column,
      position: Number(body.position)
    });
    return NextResponse.json({ tasks });
  } catch (error) {
    return jsonError(error);
  }
}

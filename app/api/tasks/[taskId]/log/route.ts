import { NextResponse } from "next/server";
import { logTaskToDay } from "@/src/core/projects/project-service";
import { getProjectRepository } from "@/src/adapters/web/project-repositories";
import { getRepositories } from "@/src/adapters/web/repositories";
import { dateFromTimestampInTimeZone, parseDateOnly } from "@/src/core/shared/date";
import { projectContext } from "@/src/lib/project-api";
import { jsonError } from "@/src/lib/api";

export async function POST(request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const context = await projectContext();
    if ("response" in context) return context.response;
    const { taskId } = await params;
    const body = await request.json();
    const today = dateFromTimestampInTimeZone(new Date(), context.programme.timezone);
    const result = await logTaskToDay(
      { projects: getProjectRepository(), entries: getRepositories().entries },
      {
        userId: context.viewer.id,
        programme: context.programme,
        taskId,
        workDate: body.workDate ? parseDateOnly(String(body.workDate)) : today,
        today,
        note: typeof body.note === "string" ? body.note : null
      }
    );
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}

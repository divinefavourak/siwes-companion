import { NextResponse } from "next/server";
import { getViewer } from "@/src/lib/viewer";
import { getRepositories } from "@/src/adapters/web/repositories";
import { updateProgrammeSettings } from "@/src/core/siwes/siwes-service";
import { jsonError } from "@/src/lib/api";

export async function GET() {
  try {
    const viewer = await getViewer();
    if (!viewer) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required" } }, { status: 401 });

    const repositories = getRepositories();
    const programme = await repositories.programmes.findActiveByUser(viewer.id);
    if (!programme) return NextResponse.json({ error: { code: "NOT_FOUND", message: "No active programme found" } }, { status: 404 });

    return NextResponse.json({ programme });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const viewer = await getViewer();
    if (!viewer) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required" } }, { status: 401 });

    const body = await request.json();
    const repositories = getRepositories();
    const programme = await repositories.programmes.findActiveByUser(viewer.id);
    if (!programme) return NextResponse.json({ error: { code: "NOT_FOUND", message: "No active programme found" } }, { status: 404 });

    const updated = await updateProgrammeSettings(repositories.programmes, {
      userId: viewer.id,
      programmeId: programme.id,
      workingWeekdays: body.workingWeekdays,
      timezone: body.timezone
    });

    return NextResponse.json({ programme: updated });
  } catch (error) {
    return jsonError(error);
  }
}

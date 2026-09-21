import { NextResponse } from "next/server";
import { buildReportDraft } from "@/src/core/reports/report-service";
import { getRepositories } from "@/src/adapters/web/repositories";
import { getViewer } from "@/src/lib/viewer";
import { toReportContext } from "@/src/lib/compile-context";
import { jsonError } from "@/src/lib/api";

export async function GET() {
  try {
    const viewer = await getViewer();
    if (!viewer) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required" } }, { status: 401 });
    const repositories = getRepositories();
    const programme = await repositories.programmes.findActiveByUser(viewer.id);
    if (!programme) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Create a programme first" } }, { status: 404 });
    const entries = await repositories.entries.listForDateRange(viewer.id, programme.id, programme.startDate, programme.endDate);
    return NextResponse.json({ report: buildReportDraft(toReportContext(programme, entries)) });
  } catch (error) {
    return jsonError(error);
  }
}

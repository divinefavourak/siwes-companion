import { NextResponse } from "next/server";
import { buildSummaryDraft } from "@/src/core/summaries/summary-service";
import { getRepositories } from "@/src/adapters/web/repositories";
import { getViewer } from "@/src/lib/viewer";
import { dateFromTimestampInTimeZone, parseDateOnly } from "@/src/core/shared/date";
import { toReviewedEntry } from "@/src/lib/compile-context";
import { jsonError } from "@/src/lib/api";

export async function GET(request: Request) {
  try {
    const viewer = await getViewer();
    if (!viewer) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required" } }, { status: 401 });
    const repositories = getRepositories();
    const programme = await repositories.programmes.findActiveByUser(viewer.id);
    if (!programme) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Create a programme first" } }, { status: 404 });
    const url = new URL(request.url);
    const end = parseDateOnly(url.searchParams.get("to") ?? dateFromTimestampInTimeZone(new Date(), programme.timezone));
    const start = parseDateOnly(url.searchParams.get("from") ?? end);
    const entries = await repositories.entries.listForDateRange(viewer.id, programme.id, start, end);
    return NextResponse.json({ summary: buildSummaryDraft(entries.filter((entry) => entry.status === "SAVED").map(toReviewedEntry), `Week ${start} to ${end}`) });
  } catch (error) {
    return jsonError(error);
  }
}

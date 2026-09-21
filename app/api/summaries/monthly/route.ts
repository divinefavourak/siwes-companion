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
    const today = dateFromTimestampInTimeZone(new Date(), programme.timezone);
    const month = url.searchParams.get("month") ?? today.slice(0, 7);
    const start = parseDateOnly(`${month}-01`);
    const [year, monthNumber] = month.split("-").map(Number);
    const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate().toString().padStart(2, "0");
    const end = parseDateOnly(`${month}-${lastDay}`);
    const entries = await repositories.entries.listForDateRange(viewer.id, programme.id, start, end);
    return NextResponse.json({ summary: buildSummaryDraft(entries.filter((entry) => entry.status === "SAVED").map(toReviewedEntry), `Month ${month}`) });
  } catch (error) {
    return jsonError(error);
  }
}

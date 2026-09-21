import { NextResponse } from "next/server";
import { captureDailyNote } from "@/src/core/entries/entry-service";
import { getRepositories } from "@/src/adapters/web/repositories";
import { getViewer } from "@/src/lib/viewer";
import { dateFromTimestampInTimeZone, parseDateOnly } from "@/src/core/shared/date";
import { jsonError } from "@/src/lib/api";

export async function POST(request: Request) {
  try {
    const viewer = await getViewer();
    if (!viewer) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required" } }, { status: 401 });
    const repositories = getRepositories();
    const programme = await repositories.programmes.findActiveByUser(viewer.id);
    if (!programme) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Create a SIWES programme first" } }, { status: 404 });
    const body = await request.json();
    const workDate = body.workDate ? parseDateOnly(String(body.workDate)) : dateFromTimestampInTimeZone(new Date(), programme.timezone);
    const entry = await captureDailyNote(repositories.entries, {
      userId: viewer.id,
      programmeId: programme.id,
      workDate,
      rawText: String(body.rawText ?? ""),
      source: body.source ?? "WEB"
    });
    return NextResponse.json({ entry });
  } catch (error) {
    return jsonError(error);
  }
}

export async function GET(request: Request) {
  try {
    const viewer = await getViewer();
    if (!viewer) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required" } }, { status: 401 });
    const repositories = getRepositories();
    const programme = await repositories.programmes.findActiveByUser(viewer.id);
    if (!programme) return NextResponse.json({ entries: [] });
    const url = new URL(request.url);
    const today = dateFromTimestampInTimeZone(new Date(), programme.timezone);
    const from = parseDateOnly(url.searchParams.get("from") ?? today);
    const to = parseDateOnly(url.searchParams.get("to") ?? today);
    const entries = await repositories.entries.listForDateRange(viewer.id, programme.id, from, to);
    return NextResponse.json({ entries });
  } catch (error) {
    return jsonError(error);
  }
}

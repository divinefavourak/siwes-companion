import { NextResponse } from "next/server";
import { getRepositories } from "@/src/adapters/web/repositories";
import { renderLogbookPdf } from "@/src/adapters/export/logbook-pdf";
import { buildLogbookWeeks } from "@/src/core/exports/logbook";
import { dateFromTimestampInTimeZone, parseDateOnly } from "@/src/core/shared/date";
import { AppError } from "@/src/core/shared/errors";
import { projectContext } from "@/src/lib/project-api";
import { jsonError } from "@/src/lib/api";

function optionalDate(value: string | null, label: string) {
  if (!value) return null;
  try {
    return parseDateOnly(value);
  } catch {
    throw new AppError("VALIDATION_ERROR", `${label} must be a date (YYYY-MM-DD)`);
  }
}

export async function GET(request: Request) {
  try {
    const context = await projectContext();
    if ("response" in context) return context.response;
    const { viewer, programme } = context;
    const url = new URL(request.url);
    const today = dateFromTimestampInTimeZone(new Date(), programme.timezone);
    const from = optionalDate(url.searchParams.get("from"), "from") ?? programme.startDate;
    const requestedTo = optionalDate(url.searchParams.get("to"), "to") ?? today;
    const to = requestedTo > today ? today : requestedTo;
    if (to < from) throw new AppError("VALIDATION_ERROR", "Nothing to export for that date range yet");

    const entries = await getRepositories().entries.listForDateRange(viewer.id, programme.id, from, to);
    const weeks = buildLogbookWeeks(programme, entries, { from, to });
    const pdf = await renderLogbookPdf({
      studentName: viewer.name,
      matricNumber: programme.matricNumber,
      institution: programme.institution,
      department: programme.department,
      level: programme.level,
      organization: programme.organization,
      unit: programme.unit,
      startDate: programme.startDate,
      endDate: programme.endDate,
      weeks,
      generatedOn: today
    });

    const slug = programme.matricNumber.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "") || "student";
    const suffix = weeks.length === 1 ? `-week-${weeks[0].number}` : "";
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="siwes-logbook-${slug}${suffix}.pdf"`,
        "Cache-Control": "private, no-store"
      }
    });
  } catch (error) {
    return jsonError(error);
  }
}

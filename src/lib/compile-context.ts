import type { Programme } from "@/src/core/siwes/types";
import type { Entry } from "@/src/core/entries/types";
import type { ProgrammeReportContext } from "@/src/core/reports/types";
import type { ReviewedEntry } from "@/src/core/summaries/types";

export function toReviewedEntry(entry: Entry): ReviewedEntry {
  return {
    id: entry.id,
    date: entry.workDate,
    text: entry.editedText ?? entry.generatedText ?? entry.rawText,
    skills: entry.structuredData?.skills ?? [],
    tools: entry.structuredData?.tools ?? [],
    projects: entry.structuredData?.projects ?? [],
    challenges: entry.structuredData?.challenges ?? []
  };
}

export function toReportContext(programme: Programme, entries: Entry[]): ProgrammeReportContext {
  return {
    institution: programme.institution,
    department: programme.department,
    organization: programme.organization,
    unit: programme.unit,
    startDate: programme.startDate,
    endDate: programme.endDate,
    entries: entries.filter((entry) => entry.status === "SAVED").map(toReviewedEntry)
  };
}

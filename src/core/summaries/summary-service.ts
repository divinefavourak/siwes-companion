import type { SummaryDraft, ReviewedEntry } from "@/src/core/summaries/types";
import type { DateOnly } from "@/src/core/shared/date";

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function buildSummaryDraft(entries: ReviewedEntry[], label: string): SummaryDraft {
  const sorted = [...entries].sort((left, right) => left.date.localeCompare(right.date));
  const workCompleted = unique(sorted.map((entry) => entry.text));
  const skills = unique(sorted.flatMap((entry) => entry.skills));
  const tools = unique(sorted.flatMap((entry) => entry.tools));
  const projects = unique(sorted.flatMap((entry) => entry.projects));
  const challenges = unique(sorted.flatMap((entry) => entry.challenges));
  const summary = sorted.length === 0
    ? `No reviewed work was recorded for ${label}.`
    : `${label}: reviewed work was recorded on ${sorted.length} day${sorted.length === 1 ? "" : "s"}.`;
  return { summary, workCompleted, skills, tools, projects, challenges, sourceEntryIds: sorted.map((entry) => entry.id) };
}

export function reviewedEntryFromRecord(input: {
  id: string;
  workDate: DateOnly;
  rawText: string;
  generatedText: string | null;
  editedText: string | null;
  structuredData: { skills?: string[]; tools?: string[]; projects?: string[]; challenges?: string[] } | null;
}): ReviewedEntry {
  return {
    id: input.id,
    date: input.workDate,
    text: input.editedText ?? input.generatedText ?? input.rawText,
    skills: input.structuredData?.skills ?? [],
    tools: input.structuredData?.tools ?? [],
    projects: input.structuredData?.projects ?? [],
    challenges: input.structuredData?.challenges ?? []
  };
}

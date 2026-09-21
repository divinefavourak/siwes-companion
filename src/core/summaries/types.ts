import type { DateOnly } from "@/src/core/shared/date";

export type ReviewedEntry = {
  id: string;
  date: DateOnly;
  text: string;
  skills: string[];
  tools: string[];
  projects: string[];
  challenges: string[];
};

export type SummaryDraft = {
  summary: string;
  workCompleted: string[];
  skills: string[];
  tools: string[];
  projects: string[];
  challenges: string[];
  sourceEntryIds: string[];
};

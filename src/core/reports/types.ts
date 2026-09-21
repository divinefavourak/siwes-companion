import type { DateOnly } from "@/src/core/shared/date";
import type { ReviewedEntry } from "@/src/core/summaries/types";

export type ReportSectionDraft = {
  sectionKey: string;
  title: string;
  position: number;
  generatedText: string;
  sourceEntryIds: string[];
  unsupportedGaps: string[];
};

export type ReportDraft = { sections: ReportSectionDraft[] };

export type ProgrammeReportContext = {
  institution: string;
  department: string;
  organization: string;
  unit: string;
  startDate: DateOnly;
  endDate: DateOnly;
  entries: ReviewedEntry[];
};

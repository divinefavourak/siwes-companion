import type { DateOnly } from "@/src/core/shared/date";

export type EntrySource = "WEB" | "TELEGRAM" | "VOICE" | "IMPORT";
export type EntryStatus = "DRAFT" | "READY_FOR_REVIEW" | "SAVED" | "ARCHIVED";
export type GenerationStatus =
  | "NOT_REQUESTED"
  | "PENDING"
  | "COMPLETED"
  | "NEEDS_CLARIFICATION"
  | "FAILED";

export type EntryStructuredData = {
  skills: string[];
  tools: string[];
  learnings: string[];
  challenges: string[];
  projects: string[];
  achievements: string[];
  claims: Array<{ text: string; source: "raw" | "derived" }>;
};

export type Entry = {
  id: string;
  programmeId: string;
  workDate: DateOnly;
  rawText: string;
  rawSource: EntrySource;
  generatedText: string | null;
  editedText: string | null;
  structuredData: EntryStructuredData | null;
  status: EntryStatus;
  generationStatus: GenerationStatus;
  generationError: string | null;
  version: number;
};

export type CaptureDailyNoteInput = {
  userId: string;
  programmeId: string;
  workDate: DateOnly;
  rawText: string;
  source: EntrySource;
};

export type GeneratedEntry = {
  formalEntry: string;
  structuredData: EntryStructuredData;
  clarificationQuestions: string[];
};

export interface EntryRepository {
  findOwnedByDate(userId: string, programmeId: string, workDate: DateOnly): Promise<Entry | null>;
  findOwnedById(userId: string, entryId: string): Promise<Entry | null>;
  upsertRawNote(input: CaptureDailyNoteInput): Promise<Entry>;
  markGenerationPending(userId: string, entryId: string): Promise<Entry>;
  saveGeneration(
    userId: string,
    entryId: string,
    generation: GeneratedEntry
  ): Promise<Entry>;
  saveGenerationFailure(userId: string, entryId: string, message: string): Promise<Entry>;
  saveEditedText(userId: string, entryId: string, editedText: string, expectedVersion: number): Promise<Entry>;
  listForDateRange(
    userId: string,
    programmeId: string,
    startDate: DateOnly,
    endDate: DateOnly
  ): Promise<Entry[]>;
}

export interface DailyEntryGenerator {
  generate(input: { rawText: string; workDate: DateOnly }): Promise<GeneratedEntry>;
}

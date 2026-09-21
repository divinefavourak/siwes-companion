import { AppError } from "@/src/core/shared/errors";
import type { DateOnly } from "@/src/core/shared/date";
import type { Programme, ProgrammeRepository } from "@/src/core/siwes/types";
import type {
  CaptureDailyNoteInput,
  DailyEntryGenerator,
  Entry,
  EntryRepository,
  GeneratedEntry
} from "@/src/core/entries/types";

type DemoState = { programmes: Map<string, Programme>; entries: Map<string, Entry> };
const globalForDemo = globalThis as typeof globalThis & { __siwesDemoState?: DemoState };
const demoState = globalForDemo.__siwesDemoState ?? { programmes: new Map<string, Programme>(), entries: new Map<string, Entry>() };
globalForDemo.__siwesDemoState = demoState;
const programmes = demoState.programmes;
const entries = demoState.entries;

function demoProgramme(userId: string): Programme {
  const existing = programmes.get(userId);
  if (existing) return existing;
  const value: Programme = {
    id: "demo-programme",
    userId,
    title: "Software Engineering SIWES",
    durationMonths: 3,
    institution: "Demo University",
    department: "Computer Science",
    level: "300",
    matricNumber: "DEMO/CS/300",
    organization: "Demo Technology Ltd",
    unit: "Product Engineering",
    startDate: "2026-09-01",
    endDate: "2026-11-30",
    timezone: "Africa/Lagos",
    workingWeekdays: [1, 2, 3, 4, 5],
    overrides: [],
    status: "ACTIVE"
  };
  programmes.set(userId, value);
  return value;
}

export class DemoProgrammeRepository implements ProgrammeRepository {
  async create(input: Parameters<ProgrammeRepository["create"]>[0]): Promise<Programme> {
    const programme: Programme = {
      id: crypto.randomUUID(),
      ...input,
      startDate: input.startDate,
      endDate: input.endDate,
      overrides: [],
      status: "ACTIVE"
    };
    programmes.set(input.userId, programme);
    return programme;
  }

  async findActiveByUser(userId: string) {
    return programmes.get(userId) ?? demoProgramme(userId);
  }

  async findOwnedById(userId: string, programmeId: string) {
    const programme = programmes.get(userId) ?? demoProgramme(userId);
    return programme.id === programmeId ? programme : null;
  }
}

export class DemoEntryRepository implements EntryRepository {
  private key(programmeId: string, workDate: DateOnly) {
    return `${programmeId}:${workDate}`;
  }

  private assertProgramme(userId: string, programmeId: string) {
    const programme = programmes.get(userId) ?? demoProgramme(userId);
    if (programme.id !== programmeId) throw new AppError("FORBIDDEN", "Programme not found");
  }

  async findOwnedByDate(userId: string, programmeId: string, workDate: DateOnly) {
    this.assertProgramme(userId, programmeId);
    return entries.get(this.key(programmeId, workDate)) ?? null;
  }

  async findOwnedById(userId: string, entryId: string) {
    const entry = entries.get(entryId);
    if (!entry) return null;
    this.assertProgramme(userId, entry.programmeId);
    return entry;
  }

  async upsertRawNote(input: CaptureDailyNoteInput) {
    this.assertProgramme(input.userId, input.programmeId);
    const key = this.key(input.programmeId, input.workDate);
    const previous = entries.get(key);
    const entry: Entry = {
      id: previous?.id ?? crypto.randomUUID(),
      programmeId: input.programmeId,
      workDate: input.workDate,
      rawText: input.rawText,
      rawSource: input.source,
      generatedText: null,
      editedText: null,
      structuredData: null,
      status: "DRAFT",
      generationStatus: "NOT_REQUESTED",
      generationError: null,
      version: (previous?.version ?? 0) + 1
    };
    entries.set(entry.id, entry);
    entries.set(key, entry);
    return entry;
  }

  async markGenerationPending(userId: string, entryId: string) {
    const entry = await this.findOwnedById(userId, entryId);
    if (!entry) throw new AppError("NOT_FOUND", "Entry not found");
    const updated = { ...entry, generationStatus: "PENDING" as const, generationError: null };
    entries.set(entry.id, updated);
    return updated;
  }

  async saveGeneration(userId: string, entryId: string, generation: GeneratedEntry) {
    const entry = await this.findOwnedById(userId, entryId);
    if (!entry) throw new AppError("NOT_FOUND", "Entry not found");
    const updated = {
      ...entry,
      generatedText: generation.formalEntry,
      structuredData: generation.structuredData,
      generationStatus: generation.clarificationQuestions.length ? "NEEDS_CLARIFICATION" as const : "COMPLETED" as const,
      status: "READY_FOR_REVIEW" as const,
      generationError: null,
      version: entry.version + 1
    };
    entries.set(entry.id, updated);
    entries.set(this.key(entry.programmeId, entry.workDate), updated);
    return updated;
  }

  async saveGenerationFailure(userId: string, entryId: string, message: string) {
    const entry = await this.findOwnedById(userId, entryId);
    if (!entry) throw new AppError("NOT_FOUND", "Entry not found");
    const updated = { ...entry, generationStatus: "FAILED" as const, generationError: message };
    entries.set(entry.id, updated);
    return updated;
  }

  async saveEditedText(userId: string, entryId: string, editedText: string, expectedVersion: number) {
    const entry = await this.findOwnedById(userId, entryId);
    if (!entry) throw new AppError("NOT_FOUND", "Entry not found");
    if (entry.version !== expectedVersion) throw new AppError("CONFLICT", "This entry changed in another channel");
    const updated = { ...entry, editedText, status: "SAVED" as const, version: entry.version + 1 };
    entries.set(entry.id, updated);
    entries.set(this.key(entry.programmeId, entry.workDate), updated);
    return updated;
  }

  async listForDateRange(userId: string, programmeId: string, startDate: DateOnly, endDate: DateOnly) {
    this.assertProgramme(userId, programmeId);
    return [...new Map([...entries.values()].map((entry) => [entry.id, entry])).values()]
      .filter((entry) => entry.programmeId === programmeId && entry.workDate >= startDate && entry.workDate <= endDate)
      .sort((left, right) => left.workDate.localeCompare(right.workDate));
  }
}

export function repositories() {
  return { programmes: new DemoProgrammeRepository(), entries: new DemoEntryRepository() };
}

export const demoGenerator: DailyEntryGenerator = {
  async generate({ rawText }) {
    const generated: GeneratedEntry = {
      formalEntry: rawText.trim(),
      structuredData: {
        skills: [], tools: [], learnings: [], challenges: [], projects: [], achievements: [],
        claims: [{ text: rawText.trim(), source: "raw" }]
      },
      clarificationQuestions: rawText.trim().length < 40 ? ["What did you personally do or learn?"] : []
    };
    return generated;
  }
};

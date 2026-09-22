import { Prisma } from "@prisma/client";
import { ensureUserExists, prisma } from "@/src/lib/prisma";
import { AppError } from "@/src/core/shared/errors";
import { parseDateOnly, toDateOnly } from "@/src/core/shared/date";
import type { Programme, ProgrammeRepository } from "@/src/core/siwes/types";
import type {
  CaptureDailyNoteInput,
  Entry,
  EntryRepository,
  EntryStructuredData,
  GeneratedEntry
} from "@/src/core/entries/types";

const defaultWeekdays = [1, 2, 3, 4, 5];

function toWeekdays(value: Prisma.JsonValue): number[] {
  if (!Array.isArray(value)) return defaultWeekdays;
  const weekdays = value.filter((day): day is number => typeof day === "number" && day >= 0 && day <= 6);
  return weekdays.length > 0 ? weekdays : defaultWeekdays;
}

function dateValue(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function mapProgramme(row: {
  id: string;
  userId: string;
  title: string | null;
  durationMonths: number;
  institution: string;
  department: string;
  level: string;
  matricNumber: string;
  organization: string;
  unit: string;
  startDate: Date;
  endDate: Date;
  timezone: string;
  workingWeekdays: Prisma.JsonValue;
  status: "ACTIVE" | "COMPLETED" | "ARCHIVED";
  workingDays: Array<{ date: Date; status: "WORKING" | "NON_WORKING" }>;
}): Programme {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    durationMonths: row.durationMonths === 6 ? 6 : 3,
    institution: row.institution,
    department: row.department,
    level: row.level,
    matricNumber: row.matricNumber,
    organization: row.organization,
    unit: row.unit,
    startDate: parseDateOnly(toDateOnly(row.startDate)),
    endDate: parseDateOnly(toDateOnly(row.endDate)),
    timezone: row.timezone,
    workingWeekdays: toWeekdays(row.workingWeekdays),
    overrides: row.workingDays.map((item) => ({
      date: parseDateOnly(toDateOnly(item.date)),
      status: item.status
    })),
    status: row.status
  };
}

export class PrismaProgrammeRepository implements ProgrammeRepository {
  async create(input: Parameters<ProgrammeRepository["create"]>[0]): Promise<Programme> {
    await ensureUserExists(input.userId);
    const row = await prisma.siwesProgramme.create({
      data: {
        userId: input.userId,
        durationMonths: input.durationMonths,
        institution: input.institution,
        department: input.department,
        level: input.level,
        matricNumber: input.matricNumber,
        organization: input.organization,
        unit: input.unit,
        startDate: dateValue(input.startDate),
        endDate: dateValue(input.endDate),
        timezone: input.timezone,
        workingWeekdays: input.workingWeekdays,
        workingDays: { create: [] }
      },
      include: { workingDays: true }
    });
    return mapProgramme(row);
  }

  async findActiveByUser(userId: string): Promise<Programme | null> {
    const row = await prisma.siwesProgramme.findFirst({
      where: { userId, status: "ACTIVE" },
      include: { workingDays: true },
      orderBy: { createdAt: "desc" }
    });
    return row ? mapProgramme(row) : null;
  }

  async findOwnedById(userId: string, programmeId: string): Promise<Programme | null> {
    const row = await prisma.siwesProgramme.findFirst({
      where: { id: programmeId, userId },
      include: { workingDays: true }
    });
    return row ? mapProgramme(row) : null;
  }

  async updateSettings(userId: string, programmeId: string, settings: { workingWeekdays?: number[]; timezone?: string }): Promise<Programme> {
    const row = await prisma.siwesProgramme.update({
      where: { id: programmeId, userId },
      data: {
        ...(settings.workingWeekdays ? { workingWeekdays: settings.workingWeekdays } : {}),
        ...(settings.timezone ? { timezone: settings.timezone } : {})
      },
      include: { workingDays: true }
    });
    return mapProgramme(row);
  }
}

function mapStructuredData(value: Prisma.JsonValue | null): EntryStructuredData | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const list = (key: string) => (Array.isArray(record[key]) ? record[key].filter((item): item is string => typeof item === "string") : []);
  const claims = Array.isArray(record.claims)
    ? record.claims.flatMap((claim) => {
        if (!claim || typeof claim !== "object" || Array.isArray(claim)) return [];
        const item = claim as Record<string, unknown>;
        return typeof item.text === "string" && (item.source === "raw" || item.source === "derived")
          ? [{ text: item.text, source: item.source as "raw" | "derived" }]
          : [];
      })
    : [];
  return {
    skills: list("skills"),
    tools: list("tools"),
    learnings: list("learnings"),
    challenges: list("challenges"),
    projects: list("projects"),
    achievements: list("achievements"),
    claims
  };
}

function mapEntry(row: {
  id: string;
  programmeId: string;
  workDate: Date;
  rawText: string;
  rawSource: "WEB" | "TELEGRAM" | "VOICE" | "IMPORT";
  generatedText: string | null;
  editedText: string | null;
  structuredData: Prisma.JsonValue | null;
  status: "DRAFT" | "READY_FOR_REVIEW" | "SAVED" | "ARCHIVED";
  generationStatus: "NOT_REQUESTED" | "PENDING" | "COMPLETED" | "NEEDS_CLARIFICATION" | "FAILED";
  generationError: string | null;
  version: number;
}): Entry {
  return {
    id: row.id,
    programmeId: row.programmeId,
    workDate: parseDateOnly(toDateOnly(row.workDate)),
    rawText: row.rawText,
    rawSource: row.rawSource,
    generatedText: row.generatedText,
    editedText: row.editedText,
    structuredData: mapStructuredData(row.structuredData),
    status: row.status,
    generationStatus: row.generationStatus,
    generationError: row.generationError,
    version: row.version
  };
}

export class PrismaEntryRepository implements EntryRepository {
  private async owned(userId: string, entryId: string) {
    return prisma.entry.findFirst({ where: { id: entryId, programme: { userId } } });
  }

  async findOwnedByDate(userId: string, programmeId: string, workDate: `${number}-${number}-${number}`) {
    const row = await prisma.entry.findFirst({
      where: { programmeId, workDate: dateValue(workDate), programme: { userId } }
    });
    return row ? mapEntry(row) : null;
  }

  async findOwnedById(userId: string, entryId: string) {
    const row = await this.owned(userId, entryId);
    return row ? mapEntry(row) : null;
  }

  async upsertRawNote(input: CaptureDailyNoteInput) {
    const programme = await prisma.siwesProgramme.findFirst({ where: { id: input.programmeId, userId: input.userId }, select: { id: true } });
    if (!programme) throw new AppError("FORBIDDEN", "Programme not found");
    const row = await prisma.entry.upsert({
      where: { programmeId_workDate: { programmeId: input.programmeId, workDate: dateValue(input.workDate) } },
      create: {
        programmeId: input.programmeId,
        workDate: dateValue(input.workDate),
        rawText: input.rawText,
        rawSource: input.source,
        status: "DRAFT"
      },
      update: {
        rawText: input.rawText,
        rawSource: input.source,
        status: "DRAFT",
        generatedText: null,
        editedText: null,
        structuredData: Prisma.JsonNull,
        generationStatus: "NOT_REQUESTED",
        generationError: null,
        version: { increment: 1 }
      }
    });
    return mapEntry(row);
  }

  async markGenerationPending(userId: string, entryId: string) {
    const row = await this.owned(userId, entryId);
    if (!row) throw new AppError("NOT_FOUND", "Entry not found");
    return mapEntry(await prisma.entry.update({ where: { id: entryId }, data: { generationStatus: "PENDING", generationError: null } }));
  }

  async saveGeneration(userId: string, entryId: string, generation: GeneratedEntry) {
    const row = await this.owned(userId, entryId);
    if (!row) throw new AppError("NOT_FOUND", "Entry not found");
    return mapEntry(await prisma.entry.update({
      where: { id: entryId },
      data: {
        generatedText: generation.formalEntry,
        structuredData: generation.structuredData as unknown as Prisma.InputJsonValue,
        generationStatus: generation.clarificationQuestions.length ? "NEEDS_CLARIFICATION" : "COMPLETED",
        status: "READY_FOR_REVIEW",
        generationError: null,
        version: { increment: 1 }
      }
    }));
  }

  async saveGenerationFailure(userId: string, entryId: string, message: string) {
    const row = await this.owned(userId, entryId);
    if (!row) throw new AppError("NOT_FOUND", "Entry not found");
    return mapEntry(await prisma.entry.update({ where: { id: entryId }, data: { generationStatus: "FAILED", generationError: message } }));
  }

  async saveEditedText(userId: string, entryId: string, editedText: string, expectedVersion: number) {
    const row = await this.owned(userId, entryId);
    if (!row) throw new AppError("NOT_FOUND", "Entry not found");
    if (row.version !== expectedVersion) throw new AppError("CONFLICT", "This entry changed in another channel");
    return mapEntry(await prisma.entry.update({
      where: { id: entryId },
      data: { editedText, status: "SAVED", lastEditedAt: new Date(), version: { increment: 1 } }
    }));
  }

  async listForDateRange(userId: string, programmeId: string, startDate: `${number}-${number}-${number}`, endDate: `${number}-${number}-${number}`) {
    const rows = await prisma.entry.findMany({
      where: { programmeId, programme: { userId }, workDate: { gte: dateValue(startDate), lte: dateValue(endDate) } },
      orderBy: { workDate: "asc" }
    });
    return rows.map(mapEntry);
  }
}

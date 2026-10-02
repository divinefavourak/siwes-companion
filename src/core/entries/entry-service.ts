import { AppError } from "@/src/core/shared/errors";
import { isDateInProgramme, parseDateOnly, type DateOnly, type ProgrammeCalendar } from "@/src/core/shared/date";
import { captureDailyNoteSchema, generatedEntrySchema } from "@/src/core/entries/entry-schema";
import type {
  CaptureDailyNoteInput,
  DailyEntryGenerator,
  Entry,
  EntryRepository,
  GeneratedEntry
} from "@/src/core/entries/types";

/** Entries can be written for any past or current day of the programme, never for the future. */
export function assertLoggableWorkDate(calendar: ProgrammeCalendar, workDate: DateOnly, today: DateOnly): void {
  if (!isDateInProgramme(calendar, workDate)) {
    throw new AppError("VALIDATION_ERROR", "That date is outside your SIWES programme");
  }
  if (workDate > today) {
    throw new AppError("VALIDATION_ERROR", "You can't log an entry for a future date");
  }
}

export async function captureDailyNote(
  repository: EntryRepository,
  input: CaptureDailyNoteInput
): Promise<Entry> {
  const parsed = captureDailyNoteSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", "Daily note is invalid", {
      issues: parsed.error.issues
    });
  }

  return repository.upsertRawNote({
    ...parsed.data,
    workDate: parseDateOnly(parsed.data.workDate)
  });
}

export async function generateEntry(
  repository: EntryRepository,
  generator: DailyEntryGenerator,
  userId: string,
  entryId: string
): Promise<Entry> {
  const entry = await repository.findOwnedById(userId, entryId);
  if (!entry) {
    throw new AppError("NOT_FOUND", "Entry not found");
  }

  await repository.markGenerationPending(userId, entryId);

  try {
    const output = generatedEntrySchema.parse(
      await generator.generate({ rawText: entry.rawText, workDate: entry.workDate })
    ) as GeneratedEntry;
    return await repository.saveGeneration(userId, entryId, output);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation failed";
    await repository.saveGenerationFailure(userId, entryId, message);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError("AI_UNAVAILABLE", "The entry draft could not be generated", { cause: message });
  }
}

export async function saveEditedEntry(
  repository: EntryRepository,
  input: { userId: string; entryId: string; editedText: string; expectedVersion: number }
): Promise<Entry> {
  const editedText = input.editedText.trim();
  if (!editedText || editedText.length > 5000) {
    throw new AppError("VALIDATION_ERROR", "Edited entry must be between 1 and 5000 characters");
  }

  return repository.saveEditedText(input.userId, input.entryId, editedText, input.expectedVersion);
}

import { z } from "zod";
import { AppError } from "@/src/core/shared/errors";
import { parseDateOnly } from "@/src/core/shared/date";
import type { CreateProgrammeInput, Programme, ProgrammeRepository } from "@/src/core/siwes/types";

export const createProgrammeSchema = z.object({
  userId: z.string().min(1),
  durationMonths: z.union([z.literal(3), z.literal(6)]),
  institution: z.string().trim().min(2).max(160),
  department: z.string().trim().min(2).max(160),
  level: z.string().trim().min(1).max(30),
  matricNumber: z.string().trim().min(2).max(80),
  organization: z.string().trim().min(2).max(160),
  unit: z.string().trim().min(2).max(160),
  startDate: z.string().refine((value) => {
    try {
      parseDateOnly(value);
      return true;
    } catch {
      return false;
    }
  }, "Use YYYY-MM-DD"),
  endDate: z.string().refine((value) => {
    try {
      parseDateOnly(value);
      return true;
    } catch {
      return false;
    }
  }, "Use YYYY-MM-DD"),
  timezone: z.string().min(1).default("Africa/Lagos"),
  workingWeekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7).default([1, 2, 3, 4, 5])
});

export async function createProgramme(
  repository: ProgrammeRepository,
  input: CreateProgrammeInput
): Promise<Programme> {
  const parsed = createProgrammeSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", "Programme details are invalid", {
      issues: parsed.error.issues
    });
  }

  if (parsed.data.endDate < parsed.data.startDate) {
    throw new AppError("VALIDATION_ERROR", "End date must be on or after start date");
  }

  const existing = await repository.findActiveByUser(parsed.data.userId);
  if (existing) {
    throw new AppError("CONFLICT", "An active SIWES programme already exists");
  }

  return repository.create({
    ...parsed.data,
    startDate: parseDateOnly(parsed.data.startDate),
    endDate: parseDateOnly(parsed.data.endDate)
  });
}

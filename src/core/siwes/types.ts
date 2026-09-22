import type { DateOnly, ProgrammeCalendar } from "@/src/core/shared/date";

export type Programme = ProgrammeCalendar & {
  id: string;
  userId: string;
  title?: string | null;
  durationMonths: 3 | 6;
  institution: string;
  department: string;
  level: string;
  matricNumber: string;
  organization: string;
  unit: string;
  status: "ACTIVE" | "COMPLETED" | "ARCHIVED";
};

export type CreateProgrammeInput = {
  userId: string;
  durationMonths: 3 | 6;
  institution: string;
  department: string;
  level: string;
  matricNumber: string;
  organization: string;
  unit: string;
  startDate: DateOnly;
  endDate: DateOnly;
  timezone?: string;
  workingWeekdays?: number[];
};

export type UpdateProgrammeSettingsInput = {
  userId: string;
  programmeId: string;
  workingWeekdays?: number[];
  timezone?: string;
};

export interface ProgrammeRepository {
  create(input: CreateProgrammeInput & { timezone: string; workingWeekdays: number[] }): Promise<Programme>;
  findActiveByUser(userId: string): Promise<Programme | null>;
  findOwnedById(userId: string, programmeId: string): Promise<Programme | null>;
  updateSettings(userId: string, programmeId: string, settings: { workingWeekdays?: number[]; timezone?: string }): Promise<Programme>;
}


export type DateOnly = `${number}-${number}-${number}`;

export type DateOverride = {
  date: DateOnly;
  status: "WORKING" | "NON_WORKING";
};

export type ProgrammeCalendar = {
  startDate: DateOnly;
  endDate: DateOnly;
  timezone: string;
  workingWeekdays: number[];
  overrides: DateOverride[];
};

const DAY_IN_MS = 86_400_000;

export function parseDateOnly(value: string): DateOnly {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Invalid date-only value: ${value}`);
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || toDateOnly(date) !== value) {
    throw new Error(`Invalid calendar date: ${value}`);
  }

  return value as DateOnly;
}

export function toDateOnly(date: Date): DateOnly {
  return date.toISOString().slice(0, 10) as DateOnly;
}

export function addDays(value: DateOnly, days: number): DateOnly {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return toDateOnly(date);
}

export function dateRange(start: DateOnly, end: DateOnly): DateOnly[] {
  const dates: DateOnly[] = [];
  for (let current = start; current <= end; current = addDays(current, 1)) {
    dates.push(current);
  }
  return dates;
}

export function weekday(value: DateOnly): number {
  return new Date(`${value}T00:00:00.000Z`).getUTCDay();
}

export function isWorkingDate(calendar: ProgrammeCalendar, date: DateOnly): boolean {
  const override = calendar.overrides.find((item) => item.date === date);
  if (override) {
    return override.status === "WORKING";
  }

  return calendar.workingWeekdays.includes(weekday(date));
}

export function workingDates(calendar: ProgrammeCalendar): DateOnly[] {
  return dateRange(calendar.startDate, calendar.endDate).filter((date) =>
    isWorkingDate(calendar, date)
  );
}

export function programmeProgress(
  calendar: ProgrammeCalendar,
  today: DateOnly,
  completedDates: DateOnly[]
) {
  const dates = workingDates(calendar);
  const elapsedDates = dates.filter((date) => date <= today);
  const completed = new Set(completedDates);
  const completedCount = dates.filter((date) => completed.has(date)).length;
  const currentDay = today < calendar.startDate ? 0 : elapsedDates.length;

  return {
    currentDay: Math.min(currentDay, dates.length),
    totalDays: dates.length,
    completedDays: completedCount,
    remainingDays: Math.max(dates.length - completedCount, 0),
    percent: dates.length === 0 ? 0 : Math.round((completedCount / dates.length) * 100)
  };
}

export function dateFromTimestampInTimeZone(timestamp: Date, timezone: string): DateOnly {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const parts = formatter.formatToParts(timestamp);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return parseDateOnly(`${values.year}-${values.month}-${values.day}`);
}

export function isDateInProgramme(calendar: ProgrammeCalendar, date: DateOnly): boolean {
  return date >= calendar.startDate && date <= calendar.endDate;
}

export function daysBetween(start: DateOnly, end: DateOnly): number {
  const startMs = new Date(`${start}T00:00:00.000Z`).getTime();
  const endMs = new Date(`${end}T00:00:00.000Z`).getTime();
  return Math.round((endMs - startMs) / DAY_IN_MS);
}

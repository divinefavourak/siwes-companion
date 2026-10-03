import {
  addDays,
  dateRange,
  formatDateOnly,
  isWorkingDate,
  startOfWeek,
  workingDates,
  type DateOnly,
  type ProgrammeCalendar
} from "@/src/core/shared/date";

export type CatchUpPlan = {
  weekStart: DateOnly;
  /** Working days earlier this week with no saved entry (today is left to the daily reminder). */
  missingThisWeek: DateOnly[];
  /** Unsaved working days before this week. */
  olderMissing: DateOnly[];
};

/** The last working day of the week containing `date`, or null if the week has none inside the programme. */
export function lastWorkingDayOfWeek(calendar: ProgrammeCalendar, date: DateOnly): DateOnly | null {
  const weekStart = startOfWeek(date);
  const days = dateRange(weekStart, addDays(weekStart, 6)).filter(
    (day) => day >= calendar.startDate && day <= calendar.endDate && isWorkingDate(calendar, day)
  );
  return days.at(-1) ?? null;
}

/**
 * Decides whether today should get a weekly catch-up nudge. It fires once, on the
 * week's last working day, and only when earlier days still lack a saved entry.
 */
export function planCatchUp(calendar: ProgrammeCalendar, savedDates: Iterable<DateOnly>, today: DateOnly): CatchUpPlan | null {
  if (lastWorkingDayOfWeek(calendar, today) !== today) return null;
  const saved = new Set(savedDates);
  const weekStart = startOfWeek(today);
  const missing = workingDates(calendar).filter((date) => date < today && !saved.has(date));
  const missingThisWeek = missing.filter((date) => date >= weekStart);
  const olderMissing = missing.filter((date) => date < weekStart);
  if (missingThisWeek.length === 0 && olderMissing.length === 0) return null;
  return { weekStart, missingThisWeek, olderMissing };
}

export function describeCatchUp(plan: CatchUpPlan): { title: string; message: string } {
  const days = plan.missingThisWeek.map((date) => formatDateOnly(date, { weekday: "long" }));
  const dayList = days.length <= 1 ? days.join("") : `${days.slice(0, -1).join(", ")} and ${days.at(-1)}`;
  const parts: string[] = [];
  if (days.length > 0) {
    parts.push(`${dayList} ${days.length === 1 ? "is" : "are"} still missing from this week's logbook.`);
  }
  if (plan.olderMissing.length > 0) {
    parts.push(
      `${days.length > 0 ? "There are also" : "You have"} ${plan.olderMissing.length} earlier working ${plan.olderMissing.length === 1 ? "day" : "days"} without a saved entry.`
    );
  }
  parts.push("Fill them in while the week is still fresh.");
  const total = plan.missingThisWeek.length + plan.olderMissing.length;
  return { title: `Catch up: ${total} ${total === 1 ? "day" : "days"} to fill in`, message: parts.join(" ") };
}

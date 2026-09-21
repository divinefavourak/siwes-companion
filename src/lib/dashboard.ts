import type { Programme } from "@/src/core/siwes/types";
import { daysBetween, dateFromTimestampInTimeZone, programmeProgress } from "@/src/core/shared/date";
import type { Entry } from "@/src/core/entries/types";

export type DashboardPhase = "DOCUMENT" | "COMPILE" | "DEFEND";

export function phaseFor(programme: Programme, today = dateFromTimestampInTimeZone(new Date(), programme.timezone)): DashboardPhase {
  const daysRemaining = Math.max(daysBetween(today, programme.endDate), 0);
  if (daysRemaining <= 14) return "DEFEND";
  if (daysRemaining <= 30 || today > programme.endDate) return "COMPILE";
  return "DOCUMENT";
}

export function dashboardProgress(programme: Programme, entries: Entry[], today?: `${number}-${number}-${number}`) {
  const current = today ?? dateFromTimestampInTimeZone(new Date(), programme.timezone);
  return programmeProgress(programme, current, entries.filter((entry) => entry.status === "SAVED").map((entry) => entry.workDate));
}

export function phaseLabel(phase: DashboardPhase): string {
  return phase === "DOCUMENT" ? "Document" : phase === "COMPILE" ? "Compile" : "Defend";
}

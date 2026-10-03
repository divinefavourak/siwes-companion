import { describe, expect, it } from "vitest";
import { buildHeatmap, computeStreaks } from "@/src/core/progress/streaks";
import type { ProgrammeCalendar } from "@/src/core/shared/date";

// 2026-09-07 is a Monday.
const calendar: ProgrammeCalendar = {
  startDate: "2026-09-07",
  endDate: "2026-10-02",
  timezone: "Africa/Nairobi",
  workingWeekdays: [1, 2, 3, 4, 5],
  overrides: [{ date: "2026-09-16", status: "NON_WORKING" }]
};

describe("streaks", () => {
  it("skips weekends and days off, and keeps the streak alive until today ends", () => {
    // Fri 11, Mon 14, Tue 15, (Wed 16 off), Thu 17 saved; today Fri 18 not logged yet.
    const saved = ["2026-09-08", "2026-09-11", "2026-09-14", "2026-09-15", "2026-09-17"] as const;
    expect(computeStreaks(calendar, saved, "2026-09-18")).toEqual({
      current: 4, longest: 4, todayIsWorkingDay: true, todayLogged: false, atRisk: true
    });
    expect(computeStreaks(calendar, [...saved, "2026-09-18"], "2026-09-18")).toMatchObject({ current: 5, todayLogged: true, atRisk: false });
    // Weekend: streak still counts through Friday.
    expect(computeStreaks(calendar, [...saved, "2026-09-18"], "2026-09-20")).toMatchObject({ current: 5, todayIsWorkingDay: false, atRisk: false });
    // Missing Monday breaks it.
    expect(computeStreaks(calendar, [...saved, "2026-09-18"], "2026-09-22")).toMatchObject({ current: 0, longest: 5 });
  });

  it("lays out a Monday-first heatmap with entry states and intensity", () => {
    const weeks = buildHeatmap(
      calendar,
      [
        { workDate: "2026-09-07", status: "SAVED", rawText: "x", editedText: "word ".repeat(90), generatedText: null },
        { workDate: "2026-09-08", status: "DRAFT", rawText: "half done", editedText: null, generatedText: null }
      ],
      "2026-09-10"
    );
    expect(weeks).toHaveLength(4);
    expect(weeks[0].cells.map((cell) => cell.state)).toEqual(["SAVED", "DRAFT", "MISSED", "MISSED", "FUTURE", "FUTURE", "FUTURE"]);
    expect(weeks[0].cells[0]).toMatchObject({ level: 3, words: 90 });
    expect(weeks[1].cells[2].state).toBe("FUTURE");
    expect(buildHeatmap(calendar, [], "2026-09-30")[1].cells.map((cell) => cell.state)).toEqual([
      "MISSED", "MISSED", "OFF", "MISSED", "MISSED", "OFF", "OFF"
    ]);
  });
});

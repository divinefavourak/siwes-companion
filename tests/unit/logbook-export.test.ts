import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { buildLogbookWeeks, programmeWeekNumber } from "@/src/core/exports/logbook";
import { renderLogbookPdf } from "@/src/adapters/export/logbook-pdf";
import type { ProgrammeCalendar } from "@/src/core/shared/date";

const calendar: ProgrammeCalendar = {
  startDate: "2026-09-02",
  endDate: "2026-10-30",
  timezone: "Africa/Lagos",
  workingWeekdays: [1, 2, 3, 4, 5],
  overrides: [{ date: "2026-09-04", status: "NON_WORKING" }]
};

const entries = [
  { workDate: "2026-09-02" as const, status: "SAVED" as const, editedText: "Crimped RJ45 cables.", generatedText: "draft" },
  { workDate: "2026-09-03" as const, status: "DRAFT" as const, editedText: null, generatedText: "Unreviewed draft" },
  { workDate: "2026-09-12" as const, status: "SAVED" as const, editedText: "Saturday server move.", generatedText: null }
];

describe("logbook export", () => {
  it("numbers weeks from the programme's first week", () => {
    expect(programmeWeekNumber(calendar, "2026-09-02")).toBe(1);
    expect(programmeWeekNumber(calendar, "2026-09-07")).toBe(2);
  });

  it("prints only reviewed entries, keeps working days blank and adds non-working days that have entries", () => {
    const weeks = buildLogbookWeeks(calendar, entries, { from: "2026-08-01", to: "2026-09-14" });
    expect(weeks.map((week) => week.number)).toEqual([1, 2, 3]);
    expect(weeks[0].days.map((day) => [day.date, day.text])).toEqual([
      ["2026-09-02", "Crimped RJ45 cables."],
      ["2026-09-03", null]
    ]);
    expect(weeks[1].days.at(-1)).toMatchObject({ date: "2026-09-12", weekday: "Saturday", text: "Saturday server move." });
    expect(weeks[2].days.map((day) => day.date)).toEqual(["2026-09-14"]);
    expect(buildLogbookWeeks(calendar, entries, { from: "2026-11-01", to: "2026-11-05" })).toEqual([]);
  });

  it("renders a multi-page PDF without failing on long or non-Latin text", async () => {
    const long = "Configured VLAN 10 → trunk on SW1 🎉 with Adéọlá. ".repeat(120);
    const weeks = buildLogbookWeeks(
      calendar,
      [{ workDate: "2026-09-02", status: "SAVED", editedText: long, generatedText: null }],
      { from: "2026-09-02", to: "2026-09-04" }
    );
    const bytes = await renderLogbookPdf({
      studentName: "Amina Wanjiru",
      matricNumber: "CS/2022/001",
      institution: "Demo University",
      department: "Computer Science",
      level: "300",
      organization: "Demo Ltd",
      unit: "Networks",
      startDate: calendar.startDate,
      endDate: calendar.endDate,
      weeks,
      generatedOn: "2026-10-03"
    });
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(3);
    expect(doc.getTitle()).toBe("SIWES Logbook - Amina Wanjiru");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/src/lib/prisma", () => ({
  prisma: {
    notification: { create: vi.fn(), findFirst: vi.fn() },
    siwesProgramme: { findMany: vi.fn() },
    entry: { findMany: vi.fn() }
  }
}));
vi.mock("@/src/adapters/telegram/telegram-sender", () => ({
  sendTelegramDailyReminder: vi.fn().mockResolvedValue(true),
  sendTelegramCatchUpReminder: vi.fn().mockResolvedValue(true),
  sendTelegramTestMessage: vi.fn().mockResolvedValue(true)
}));
vi.mock("@/src/lib/email", () => ({ sendEmail: vi.fn().mockResolvedValue({ success: true }) }));

import { prisma } from "@/src/lib/prisma";
import { sendTelegramCatchUpReminder } from "@/src/adapters/telegram/telegram-sender";
import { sendEmail } from "@/src/lib/email";
import { runCatchUpSweep } from "@/src/core/notifications/notification-service";
import { describeCatchUp, lastWorkingDayOfWeek, planCatchUp } from "@/src/core/progress/catch-up";
import type { ProgrammeCalendar } from "@/src/core/shared/date";

// 2026-09-14 is a Monday.
const calendar: ProgrammeCalendar = {
  startDate: "2026-09-07",
  endDate: "2026-10-30",
  timezone: "Africa/Nairobi",
  workingWeekdays: [1, 2, 3, 4, 5],
  overrides: [{ date: "2026-09-25", status: "NON_WORKING" }]
};

describe("catch-up planning", () => {
  it("finds the week's last working day, honouring days off", () => {
    expect(lastWorkingDayOfWeek(calendar, "2026-09-15")).toBe("2026-09-18");
    expect(lastWorkingDayOfWeek(calendar, "2026-09-22")).toBe("2026-09-24");
  });

  it("only fires on the last working day and when days are missing", () => {
    const allSaved = ["2026-09-07", "2026-09-08", "2026-09-09", "2026-09-10", "2026-09-11", "2026-09-14", "2026-09-15", "2026-09-16", "2026-09-17"] as const;
    expect(planCatchUp(calendar, allSaved, "2026-09-17")).toBeNull();
    expect(planCatchUp(calendar, allSaved, "2026-09-18")).toBeNull();

    const plan = planCatchUp(calendar, ["2026-09-07", "2026-09-14", "2026-09-17"], "2026-09-18");
    expect(plan).toEqual({
      weekStart: "2026-09-14",
      missingThisWeek: ["2026-09-15", "2026-09-16"],
      olderMissing: ["2026-09-08", "2026-09-09", "2026-09-10", "2026-09-11"]
    });
    expect(describeCatchUp(plan!)).toEqual({
      title: "Catch up: 6 days to fill in",
      message:
        "Tuesday and Wednesday are still missing from this week's logbook. There are also 4 earlier working days without a saved entry. Fill them in while the week is still fresh."
    });
  });
});

describe("catch-up sweep", () => {
  const programmeRow = {
    id: "prog-1",
    userId: "user-1",
    timezone: "Africa/Nairobi",
    startDate: new Date("2026-09-14T00:00:00Z"),
    endDate: new Date("2026-10-30T00:00:00Z"),
    workingWeekdays: [1, 2, 3, 4, 5],
    workingDays: [],
    user: {
      name: "Amina",
      email: "amina@example.com",
      telegramIdentity: { telegramUserId: "42" },
      notificationPreference: { dailyReminderTelegram: true, weeklyRollupEmail: true }
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.siwesProgramme.findMany).mockResolvedValue([programmeRow] as never);
    vi.mocked(prisma.entry.findMany).mockResolvedValue([{ workDate: new Date("2026-09-14T00:00:00Z") }] as never);
  });

  it("notifies once per week across in-app, Telegram and email", async () => {
    vi.mocked(prisma.notification.findFirst).mockResolvedValueOnce(null);
    const result = await runCatchUpSweep({ dateOverride: "2026-09-18" });
    expect(result).toMatchObject({ remindersSent: 1, telegramSent: 1, emailSent: 1, errors: [] });
    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: "ACTION_REQUIRED",
        link: "/dashboard/history?week=2026-09-14",
        metadata: expect.objectContaining({ kind: "CATCH_UP", weekStart: "2026-09-14", missingThisWeek: ["2026-09-15", "2026-09-16", "2026-09-17"] })
      })
    });
    expect(sendTelegramCatchUpReminder).toHaveBeenCalledWith(expect.objectContaining({ telegramUserId: "42", weekStart: "2026-09-14" }));
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "amina@example.com", subject: "Catch up: 3 days to fill in" }));

    vi.mocked(prisma.notification.findFirst).mockResolvedValueOnce({ id: "n1" } as never);
    const again = await runCatchUpSweep({ dateOverride: "2026-09-18" });
    expect(again).toMatchObject({ remindersSent: 0, skippedAlreadyReminded: 1 });
  });

  it("stays quiet mid-week", async () => {
    const result = await runCatchUpSweep({ dateOverride: "2026-09-16" });
    expect(result).toMatchObject({ remindersSent: 0, skippedNothingMissing: 1 });
    expect(prisma.notification.findFirst).not.toHaveBeenCalled();
  });
});

import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock dependencies before imports
vi.mock("@/src/lib/prisma", () => ({
  prisma: {
    notification: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    notificationPreference: {
      findUnique: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
    },
    siwesProgramme: {
      findMany: vi.fn(),
    },
    entry: {
      findFirst: vi.fn(),
    },
    telegramIdentity: {
      findUnique: vi.fn(),
    },
    job: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/src/adapters/telegram/telegram-sender", () => ({
  sendTelegramDailyReminder: vi.fn().mockResolvedValue(true),
  sendTelegramTestMessage: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/src/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}));

import { prisma } from "@/src/lib/prisma";
import { sendTelegramDailyReminder } from "@/src/adapters/telegram/telegram-sender";
import {
  createNotification,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getNotificationPreference,
  updateNotificationPreference,
  runDailyReminderSweep,
} from "@/src/core/notifications/notification-service";

describe("Notification Service Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("In-App Notification CRUD", () => {
    it("creates a notification with defaults", async () => {
      vi.mocked(prisma.notification.create).mockResolvedValueOnce({
        id: "notif-1",
        userId: "user-1",
        title: "Test Alert",
        message: "This is a test notification",
        type: "INFO",
        link: "/dashboard",
        read: false,
        readAt: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await createNotification({
        userId: "user-1",
        title: "Test Alert",
        message: "This is a test notification",
        link: "/dashboard",
      });

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: "user-1",
          title: "Test Alert",
          message: "This is a test notification",
          type: "INFO",
          link: "/dashboard",
          metadata: undefined,
        },
      });
      expect(result.id).toBe("notif-1");
    });

    it("fetches user notifications and calculates unread count", async () => {
      const mockNotifications = [
        {
          id: "n-1",
          title: "Daily Reminder",
          message: "Log today",
          type: "REMINDER",
          link: "/dashboard",
          read: false,
          readAt: null,
          createdAt: new Date(),
        },
        {
          id: "n-2",
          title: "Update",
          message: "System update",
          type: "INFO",
          link: null,
          read: true,
          readAt: new Date(),
          createdAt: new Date(),
        },
      ];

      vi.mocked(prisma.notification.findMany).mockResolvedValueOnce(mockNotifications as any);
      vi.mocked(prisma.notification.count).mockResolvedValueOnce(1);

      const res = await getUserNotifications("user-1");

      expect(res.notifications).toHaveLength(2);
      expect(res.unreadCount).toBe(1);
    });

    it("marks single notification as read", async () => {
      vi.mocked(prisma.notification.updateMany).mockResolvedValueOnce({ count: 1 });

      await markNotificationAsRead("user-1", "n-1");

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { id: "n-1", userId: "user-1" },
        data: expect.objectContaining({ read: true }),
      });
    });

    it("marks all notifications as read for a user", async () => {
      vi.mocked(prisma.notification.updateMany).mockResolvedValueOnce({ count: 3 });

      await markAllNotificationsAsRead("user-1");

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: "user-1", read: false },
        data: expect.objectContaining({ read: true }),
      });
    });
  });

  describe("Notification Preferences", () => {
    it("returns default preferences if not yet created", async () => {
      vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValueOnce(null);
      vi.mocked(prisma.notificationPreference.create).mockResolvedValueOnce({
        id: "pref-1",
        userId: "user-1",
        dailyReminderTelegram: true,
        dailyReminderEmail: false,
        weeklyRollupEmail: true,
        reminderHour: 17,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const pref = await getNotificationPreference("user-1");

      expect(pref.dailyReminderTelegram).toBe(true);
      expect(pref.reminderHour).toBe(17);
      expect(prisma.notificationPreference.create).toHaveBeenCalled();
    });

    it("updates preferences via upsert", async () => {
      vi.mocked(prisma.notificationPreference.upsert).mockResolvedValueOnce({
        id: "pref-1",
        userId: "user-1",
        dailyReminderTelegram: false,
        dailyReminderEmail: true,
        weeklyRollupEmail: true,
        reminderHour: 18,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const updated = await updateNotificationPreference("user-1", {
        dailyReminderTelegram: false,
        dailyReminderEmail: true,
        reminderHour: 18,
      });

      expect(updated.dailyReminderTelegram).toBe(false);
      expect(updated.reminderHour).toBe(18);
    });
  });

  describe("Daily Reminder Sweep Engine", () => {
    it("skips when student already logged today's work", async () => {
      // Wednesday 2026-09-02
      const mockProgramme = {
        id: "prog-1",
        userId: "user-1",
        organization: "Tech Corp",
        startDate: new Date("2026-09-01"),
        endDate: new Date("2026-12-01"),
        timezone: "Africa/Lagos",
        workingWeekdays: [1, 2, 3, 4, 5],
        workingDays: [],
        user: {
          id: "user-1",
          name: "Divine",
          email: "divine@example.com",
          telegramIdentity: { telegramUserId: "123456" },
          notificationPreference: { dailyReminderTelegram: true, dailyReminderEmail: false },
        },
      };

      vi.mocked(prisma.siwesProgramme.findMany).mockResolvedValueOnce([mockProgramme as any]);
      // Entry already exists!
      vi.mocked(prisma.entry.findFirst).mockResolvedValueOnce({ id: "entry-1" } as any);

      const sweep = await runDailyReminderSweep({ dateOverride: "2026-09-02" });

      expect(sweep.totalProgrammesChecked).toBe(1);
      expect(sweep.skippedAlreadyLogged).toBe(1);
      expect(sweep.remindersSent).toBe(0);
      expect(prisma.notification.create).not.toHaveBeenCalled();
    });

    it("dispatches in-app and Telegram reminders when log is missing on a working day", async () => {
      // Wednesday 2026-09-02 (Day 3)
      const mockProgramme = {
        id: "prog-1",
        userId: "user-1",
        organization: "Nigerian Ports Authority",
        startDate: new Date("2026-09-01"),
        endDate: new Date("2026-12-01"),
        timezone: "Africa/Lagos",
        workingWeekdays: [1, 2, 3, 4, 5],
        workingDays: [],
        user: {
          id: "user-1",
          name: "Divine Favour",
          email: "divine@example.com",
          telegramIdentity: { telegramUserId: "998877" },
          notificationPreference: { dailyReminderTelegram: true, dailyReminderEmail: false },
        },
      };

      vi.mocked(prisma.siwesProgramme.findMany).mockResolvedValueOnce([mockProgramme as any]);
      // No entry logged yet!
      vi.mocked(prisma.entry.findFirst).mockResolvedValueOnce(null);
      // No reminder sent yet today!
      vi.mocked(prisma.notification.findFirst).mockResolvedValueOnce(null);
      vi.mocked(prisma.notification.create).mockResolvedValueOnce({ id: "notif-new" } as any);

      const sweep = await runDailyReminderSweep({ dateOverride: "2026-09-02" });

      expect(sweep.remindersSent).toBe(1);
      expect(sweep.telegramSent).toBe(1);
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "user-1",
          title: "Daily Logbook Reminder",
          type: "REMINDER",
        }),
      });
      expect(sendTelegramDailyReminder).toHaveBeenCalledWith({
        telegramUserId: "998877",
        studentName: "Divine Favour",
        organization: "Nigerian Ports Authority",
        workDate: "2026-09-02",
      });
    });

    it("is strictly idempotent and does not send duplicate reminders on the same date", async () => {
      const mockProgramme = {
        id: "prog-1",
        userId: "user-1",
        organization: "Tech Corp",
        startDate: new Date("2026-09-01"),
        endDate: new Date("2026-12-01"),
        timezone: "Africa/Lagos",
        workingWeekdays: [1, 2, 3, 4, 5],
        workingDays: [],
        user: {
          id: "user-1",
          name: "Divine",
          email: "divine@example.com",
          telegramIdentity: { telegramUserId: "123456" },
          notificationPreference: { dailyReminderTelegram: true, dailyReminderEmail: false },
        },
      };

      vi.mocked(prisma.siwesProgramme.findMany).mockResolvedValueOnce([mockProgramme as any]);
      // No entry logged
      vi.mocked(prisma.entry.findFirst).mockResolvedValueOnce(null);
      // But already reminded today!
      vi.mocked(prisma.notification.findFirst).mockResolvedValueOnce({ id: "existing-reminder" } as any);

      const sweep = await runDailyReminderSweep({ dateOverride: "2026-09-02" });

      expect(sweep.skippedAlreadyReminded).toBe(1);
      expect(sweep.remindersSent).toBe(0);
      expect(prisma.notification.create).not.toHaveBeenCalled();
      expect(sendTelegramDailyReminder).not.toHaveBeenCalled();
    });
  });
});

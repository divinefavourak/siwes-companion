import { prisma } from "@/src/lib/prisma";
import type { NotificationType, Prisma } from "@prisma/client";
import { dateFromTimestampInTimeZone, parseDateOnly, weekday, toDateOnly, type DateOnly } from "@/src/core/shared/date";
import { sendTelegramDailyReminder } from "@/src/adapters/telegram/telegram-sender";
import { sendEmail } from "@/src/lib/email";
import { renderBrandedEmail } from "@/src/lib/email-templates";
import { env } from "@/src/lib/env";

export interface CreateNotificationInput {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  link?: string | null;
  metadata?: Prisma.InputJsonValue;
}

export interface UserNotificationsResult {
  notifications: Array<{
    id: string;
    title: string;
    message: string;
    type: NotificationType;
    link: string | null;
    read: boolean;
    readAt: Date | null;
    createdAt: Date;
  }>;
  unreadCount: number;
}

export async function createNotification(input: CreateNotificationInput) {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      title: input.title,
      message: input.message,
      type: input.type ?? "INFO",
      link: input.link,
      metadata: input.metadata,
    },
  });
}

export async function getUserNotifications(userId: string, limit = 20): Promise<UserNotificationsResult> {
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        title: true,
        message: true,
        type: true,
        link: true,
        read: true,
        readAt: true,
        createdAt: true,
      },
    }),
    prisma.notification.count({
      where: { userId, read: false },
    }),
  ]);

  return { notifications, unreadCount };
}

export async function markNotificationAsRead(userId: string, notificationId: string) {
  return prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { read: true, readAt: new Date() },
  });
}

export async function markAllNotificationsAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true, readAt: new Date() },
  });
}

export async function deleteNotification(userId: string, notificationId: string) {
  return prisma.notification.deleteMany({
    where: { id: notificationId, userId },
  });
}

export async function getNotificationPreference(userId: string) {
  let preference = await prisma.notificationPreference.findUnique({
    where: { userId },
  });

  if (!preference) {
    preference = await prisma.notificationPreference.create({
      data: {
        userId,
        dailyReminderTelegram: true,
        dailyReminderEmail: false,
        weeklyRollupEmail: true,
        reminderHour: 17,
      },
    });
  }

  return preference;
}

export async function updateNotificationPreference(
  userId: string,
  data: {
    dailyReminderTelegram?: boolean;
    dailyReminderEmail?: boolean;
    weeklyRollupEmail?: boolean;
    reminderHour?: number;
  }
) {
  return prisma.notificationPreference.upsert({
    where: { userId },
    update: data,
    create: {
      userId,
      dailyReminderTelegram: data.dailyReminderTelegram ?? true,
      dailyReminderEmail: data.dailyReminderEmail ?? false,
      weeklyRollupEmail: data.weeklyRollupEmail ?? true,
      reminderHour: data.reminderHour ?? 17,
    },
  });
}

export interface ReminderSweepResult {
  date: string;
  totalProgrammesChecked: number;
  remindersSent: number;
  telegramSent: number;
  emailSent: number;
  skippedAlreadyLogged: number;
  skippedNotWorkingDay: number;
  skippedAlreadyReminded: number;
  errors: string[];
}

/**
 * Runs a sweep across all active SIWES programmes to identify students who haven't logged today's work
 * and dispatches in-app, Telegram, and email reminders idempotently.
 */
export async function runDailyReminderSweep(options?: { dateOverride?: string }): Promise<ReminderSweepResult> {
  const result: ReminderSweepResult = {
    date: options?.dateOverride || toDateOnly(new Date()),
    totalProgrammesChecked: 0,
    remindersSent: 0,
    telegramSent: 0,
    emailSent: 0,
    skippedAlreadyLogged: 0,
    skippedNotWorkingDay: 0,
    skippedAlreadyReminded: 0,
    errors: [],
  };

  const activeProgrammes = await prisma.siwesProgramme.findMany({
    where: { status: "ACTIVE" },
    include: {
      user: {
        include: {
          telegramIdentity: true,
          notificationPreference: true,
        },
      },
      workingDays: true,
    },
  });

  result.totalProgrammesChecked = activeProgrammes.length;

  for (const programme of activeProgrammes) {
    try {
      const timezone = programme.timezone || "Africa/Lagos";
      const workDate = options?.dateOverride
        ? parseDateOnly(options.dateOverride)
        : dateFromTimestampInTimeZone(new Date(), timezone);

      // Check placement date boundaries
      const progStart = toDateOnly(programme.startDate);
      const progEnd = toDateOnly(programme.endDate);
      if (workDate < progStart || workDate > progEnd) {
        continue;
      }

      // Check working days
      const currentDayOfWeek = weekday(workDate);
      const workingWeekdays = (
        Array.isArray(programme.workingWeekdays) ? programme.workingWeekdays : [1, 2, 3, 4, 5]
      ) as number[];

      const isDefaultWorkingDay = workingWeekdays.includes(currentDayOfWeek);
      const override = programme.workingDays.find(
        (o) => toDateOnly(o.date) === workDate
      );

      const isWorkingDay = override
        ? override.status === "WORKING"
        : isDefaultWorkingDay;

      if (!isWorkingDay) {
        result.skippedNotWorkingDay++;
        continue;
      }

      // Check if entry already exists for this date
      const workDateObj = new Date(`${workDate}T00:00:00.000Z`);
      const existingEntry = await prisma.entry.findFirst({
        where: {
          programmeId: programme.id,
          workDate: workDateObj,
        },
      });

      if (existingEntry) {
        result.skippedAlreadyLogged++;
        continue;
      }

      // Idempotency: Check if reminder was already sent to this user for this date
      const existingReminder = await prisma.notification.findFirst({
        where: {
          userId: programme.userId,
          type: "REMINDER",
          createdAt: {
            gte: new Date(`${workDate}T00:00:00.000Z`),
            lte: new Date(`${workDate}T23:59:59.999Z`),
          },
        },
      });

      if (existingReminder) {
        result.skippedAlreadyReminded++;
        continue;
      }

      // 1. Create In-App Notification
      await createNotification({
        userId: programme.userId,
        title: "Daily Logbook Reminder",
        message: `You haven't logged today's activities for ${programme.organization || "your placement"} (${workDate}) yet. Take 60 seconds to capture your day!`,
        type: "REMINDER",
        link: "/dashboard",
        metadata: {
          workDate,
          programmeId: programme.id,
          kind: "DAILY_REMINDER",
        },
      });
      result.remindersSent++;

      const pref = programme.user.notificationPreference;

      // 2. Dispatch Telegram if enabled and linked
      const telegramIdentity = programme.user.telegramIdentity;
      const sendTelegram = pref ? pref.dailyReminderTelegram : true;
      if (sendTelegram && telegramIdentity?.telegramUserId) {
        const sent = await sendTelegramDailyReminder({
          telegramUserId: telegramIdentity.telegramUserId,
          studentName: programme.user.name,
          organization: programme.organization,
          workDate,
        });
        if (sent) result.telegramSent++;
      }

      // 3. Dispatch Email if enabled
      const sendEmailReminder = pref ? pref.dailyReminderEmail : false;
      if (sendEmailReminder && programme.user.email) {
        const emailHtml = renderBrandedEmail({
          title: "Daily SIWES Logbook Reminder",
          greeting: `Hello ${programme.user.name || "Student"},`,
          bodyHtml: `
            <p>Your placement workday at <strong>${programme.organization}</strong> has concluded for today (<strong>${workDate}</strong>).</p>
            <p>Don't let your daily learnings and practical observations slip away! Consistent logbook documentation makes university supervisor approvals and weekly rollups effortless.</p>
          `,
          actionUrl: `${env.appUrl}/dashboard`,
          actionLabel: "Log Today's Work",
          footerNote: "You can change your reminder settings anytime in your account Settings.",
        });

        const emailRes = await sendEmail({
          to: programme.user.email,
          subject: `Daily SIWES Logbook Reminder — ${workDate}`,
          html: emailHtml,
        });
        if (emailRes.success) result.emailSent++;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      result.errors.push(`Programme ${programme.id}: ${message}`);
    }
  }

  return result;
}

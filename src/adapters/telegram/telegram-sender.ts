import { Bot } from "grammy";
import { env } from "@/src/lib/env";
import type { DateOnly } from "@/src/core/shared/date";
import { catchUpView, reminderView, testNotificationView, type View } from "@/src/adapters/telegram/views";

/**
 * Push a card to a student outside of a conversation (reminders, confirmations).
 * Returns false instead of throwing so one blocked chat never stops a batch.
 */
export async function sendTelegramView(telegramUserId: string, view: View): Promise<boolean> {
  if (!env.telegramBotToken) {
    console.warn("Cannot send Telegram message: TELEGRAM_BOT_TOKEN not configured");
    return false;
  }
  try {
    await new Bot(env.telegramBotToken).api.sendMessage(telegramUserId, view.text, {
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
      reply_markup: view.keyboard
    });
    return true;
  } catch (error) {
    console.error(`Failed to send Telegram message to ${telegramUserId}:`, error);
    return false;
  }
}

export async function sendTelegramDailyReminder(input: {
  telegramUserId: string;
  studentName?: string | null;
  organization?: string | null;
  workDate: string;
}): Promise<boolean> {
  return sendTelegramView(
    input.telegramUserId,
    reminderView({ name: input.studentName, organization: input.organization, workDate: input.workDate as DateOnly })
  );
}

export async function sendTelegramTestMessage(input: { telegramUserId: string; studentName?: string | null }): Promise<boolean> {
  return sendTelegramView(input.telegramUserId, testNotificationView(input.studentName));
}

export async function sendTelegramCatchUpReminder(input: {
  telegramUserId: string;
  studentName?: string | null;
  title: string;
  message: string;
  missingThisWeek: DateOnly[];
  weekStart: DateOnly;
}): Promise<boolean> {
  return sendTelegramView(
    input.telegramUserId,
    catchUpView({
      name: input.studentName,
      title: input.title,
      message: input.message,
      missingThisWeek: input.missingThisWeek,
      historyUrl: `${env.appUrl}/dashboard/history?week=${input.weekStart}`,
      dayUrl: (date) => `${env.appUrl}/dashboard/today?date=${date}`
    })
  );
}

import { Bot, InlineKeyboard } from "grammy";
import { env } from "@/src/lib/env";

/**
 * Send an interactive daily logbook reminder to a student via Telegram.
 */
export async function sendTelegramDailyReminder(input: {
  telegramUserId: string;
  studentName?: string | null;
  organization?: string | null;
  workDate: string;
}): Promise<boolean> {
  if (!env.telegramBotToken) {
    console.warn("Cannot send Telegram reminder: TELEGRAM_BOT_TOKEN not configured");
    return false;
  }

  try {
    const bot = new Bot(env.telegramBotToken);
    const greeting = input.studentName ? `Hey <b>${input.studentName}</b>` : "Hello";
    const orgText = input.organization ? ` at <b>${input.organization}</b>` : "";

    const message =
      `🔔 <b>Time to log your SIWES day!</b>\n\n` +
      `${greeting}, your placement workday${orgText} is wrapping up for today (<b>${input.workDate}</b>).\n\n` +
      `Don't let your valuable practical experience slip away. Take 60 seconds to jot down what you worked on, equipment used, or challenges solved.\n\n` +
      `Tap <b>Log Today's Work</b> below or send your notes directly to this chat:`;

    const keyboard = new InlineKeyboard()
      .text("✍️ Log Today's Work", "cmd:log")
      .text("📅 Today's Status", "cmd:today")
      .row()
      .url("🌐 Open Web Studio", `${env.appUrl}/dashboard`);

    await bot.api.sendMessage(input.telegramUserId, message, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
    return true;
  } catch (error) {
    console.error(`Failed to send Telegram reminder to ${input.telegramUserId}:`, error);
    return false;
  }
}

/**
 * Send a verification/test message to confirm Telegram integration is operational.
 */
export async function sendTelegramTestMessage(input: {
  telegramUserId: string;
  studentName?: string | null;
}): Promise<boolean> {
  if (!env.telegramBotToken) {
    return false;
  }

  try {
    const bot = new Bot(env.telegramBotToken);
    const greeting = input.studentName ? `Hello <b>${input.studentName}</b>!` : "Hello!";

    const message =
      `🎉 <b>SIWES Companion — Test Notification</b>\n\n` +
      `${greeting}\n\n` +
      `Your Telegram notifications are successfully connected and verified.\n\n` +
      `• <b>Daily Nudges:</b> Sent at 5:00 PM WAT on working days if not yet logged.\n` +
      `• <b>Interactive Logging:</b> You can submit rough notes anytime right here in this chat.\n\n` +
      `Tap below to test the quick-logging flow:`;

    const keyboard = new InlineKeyboard()
      .text("✍️ Try Quick Log", "cmd:log")
      .text("📅 View Today", "cmd:today");

    await bot.api.sendMessage(input.telegramUserId, message, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
    return true;
  } catch (error) {
    console.error(`Failed to send Telegram test message to ${input.telegramUserId}:`, error);
    return false;
  }
}

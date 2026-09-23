import { Bot, InlineKeyboard, type Context } from "grammy";
import { AppError } from "@/src/core/shared/errors";
import { addDays, dateFromTimestampInTimeZone, parseDateOnly, weekday, type DateOnly } from "@/src/core/shared/date";
import { captureDailyNote, generateEntry, saveEditedEntry } from "@/src/core/entries/entry-service";
import type { EntryRepository } from "@/src/core/entries/types";
import type { DailyEntryGenerator } from "@/src/core/entries/types";
import type { ProgrammeRepository } from "@/src/core/siwes/types";
import { createProgramme } from "@/src/core/siwes/siwes-service";
import { consumeTelegramLinkToken } from "@/src/core/telegram/link-service";
import { escapeTelegramHtml, chunkTelegramText } from "@/src/adapters/telegram/format";
import type { PrismaTelegramRepository } from "@/src/adapters/telegram/prisma-telegram-repository";

export const BOT_COMMANDS = [
  { command: "today", description: "View today's status & logbook entry" },
  { command: "log", description: "Capture daily work activity note" },
  { command: "week", description: "Review this week's entries & rollup" },
  { command: "skills", description: "List acquired technical skills & tools" },
  { command: "defense", description: "Practice mock oral defense questions" },
  { command: "settings", description: "View programme schedule & Telegram link" },
  { command: "start", description: "Onboard or restart conversation" },
  { command: "help", description: "View available commands & guide" },
  { command: "cancel", description: "Cancel current active draft or flow" },
  { command: "unlink", description: "Disconnect Telegram from your SIWES account" }
];

export async function registerBotCommands(bot: Bot) {
  try {
    await bot.api.setMyCommands(BOT_COMMANDS);
    console.log("Successfully registered Telegram slash commands menu.");
  } catch (error) {
    console.error("Failed to register Telegram slash commands:", error);
  }
}

type TelegramRepository = PrismaTelegramRepository & {
  findUserIdByTelegramUser(id: string): Promise<string | null>;
  findOrCreateUserByTelegramUser(id: string, profile?: { username?: string; firstName?: string }): Promise<string>;
  unlinkTelegramUser(id: string): Promise<void>;
  getConversationState(userId: string): Promise<{ state: string; payload: unknown } | null>;
  clearConversationState(userId: string): Promise<void>;
  saveConversationState(input: { userId: string; telegramChatId: string; state: string; payload: unknown }): Promise<void>;
};

function telegramUserId(ctx: Context): string | null {
  return ctx.from?.id ? String(ctx.from.id) : null;
}

async function replyChunks(ctx: Context, text: string, keyboard?: InlineKeyboard) {
  const chunks = chunkTelegramText(text);
  for (const [index, chunk] of chunks.entries()) {
    await ctx.reply(chunks.length > 1 ? `${index + 1}/${chunks.length}\n${chunk}` : chunk, {
      parse_mode: "HTML",
      reply_markup: index === chunks.length - 1 ? keyboard : undefined
    });
  }
}

function getWeekBoundaries(date: DateOnly): { monday: DateOnly; friday: DateOnly } {
  const day = weekday(date);
  const offset = day === 0 ? -6 : 1 - day;
  const monday = addDays(date, offset);
  const friday = addDays(monday, 4);
  return { monday, friday };
}

export function createTelegramBot(input: {
  token: string;
  telegram: TelegramRepository;
  entries: EntryRepository;
  programmes: ProgrammeRepository;
  generator: DailyEntryGenerator;
}) {
  const bot = new Bot(input.token);

  async function linkedUser(ctx: Context) {
    const id = telegramUserId(ctx);
    return id ? input.telegram.findUserIdByTelegramUser(id) : null;
  }

  // -------------------------------------------------------------
  // /start
  // -------------------------------------------------------------
  bot.command("start", async (ctx) => {
    await ctx.replyWithChatAction("typing");
    const token = ctx.match?.trim();
    const id = telegramUserId(ctx);
    if (!id) return;

    if (token) {
      try {
        await consumeTelegramLinkToken(input.telegram, token, id, {
          username: ctx.from?.username,
          firstName: ctx.from?.first_name
        });
        const keyboard = new InlineKeyboard()
          .text("✍️ Log Today's Work", "cmd:log")
          .text("📅 Today's Status", "cmd:today")
          .row()
          .text("📊 This Week", "cmd:week")
          .text("⚙️ Settings", "cmd:settings");

        await ctx.reply(
          "🎉 <b>Telegram Linked Successfully!</b>\n\nYour SIWES Companion is now active. You can log daily tasks, generate formal logbook entries, and practice defense questions right here.",
          { parse_mode: "HTML", reply_markup: keyboard }
        );
      } catch (error) {
        await ctx.reply(error instanceof AppError ? error.message : "That link is no longer valid. Start a new link from the web app.");
      }
      return;
    }

    const userId = await input.telegram.findUserIdByTelegramUser(id);
    if (userId) {
      const programme = await input.programmes.findActiveByUser(userId);
      if (programme) {
        const keyboard = new InlineKeyboard()
          .text("✍️ Log Today's Work", "cmd:log")
          .text("📅 Today's Status", "cmd:today")
          .row()
          .text("📊 Weekly Rollup", "cmd:week")
          .text("🎯 Practice Defense", "cmd:defense")
          .row()
          .text("⚙️ Settings", "cmd:settings")
          .text("❓ Help & Commands", "cmd:help");

        await ctx.reply(
          `👋 <b>Welcome back${ctx.from?.first_name ? `, ${ctx.from.first_name}` : ""}!</b>\n\n` +
          `🏛 <b>Institution:</b> ${escapeTelegramHtml(programme.institution)}\n` +
          `🏢 <b>Placement:</b> ${escapeTelegramHtml(programme.organization)}\n` +
          `⏱ <b>Duration:</b> ${programme.durationMonths} Months (${programme.startDate} to ${programme.endDate})\n\n` +
          `What would you like to do today?`,
          { parse_mode: "HTML", reply_markup: keyboard }
        );
        return;
      }
    }

    // Fresh user - Offer in-bot onboarding or web link
    const welcomeKeyboard = new InlineKeyboard()
      .text("🚀 Setup SIWES on Telegram", "onboard:start")
      .row()
      .text("🔗 Link Web Account", "onboard:link")
      .row()
      .text("📖 What is SIWES Companion?", "onboard:about");

    await ctx.reply(
      "👋 <b>Welcome to SIWES Companion!</b>\n\n" +
      "Your intelligent assistant for the Nigerian Student Industrial Work Experience Scheme (SIWES).\n\n" +
      "• <b>Zero-effort daily logging:</b> Turn rough notes into standard logbook entries\n" +
      "• <b>AI Grounding:</b> Never invents fake tasks; preserves your authentic training\n" +
      "• <b>Weekly rollups & Defense preparation:</b> Get ready for oral exams anytime\n\n" +
      "Get started directly below:",
      { parse_mode: "HTML", reply_markup: welcomeKeyboard }
    );
  });

  // -------------------------------------------------------------
  // /help
  // -------------------------------------------------------------
  bot.command("help", async (ctx) => {
    const keyboard = new InlineKeyboard()
      .text("✍️ Log Today", "cmd:log")
      .text("📅 View Today", "cmd:today")
      .row()
      .text("📊 Weekly Rollup", "cmd:week")
      .text("🎯 Mock Defense", "cmd:defense");

    await ctx.reply(
      "📖 <b>SIWES Companion Commands</b>\n\n" +
      "• /today — Check today's logbook entry\n" +
      "• /log — Submit a quick rough note of what you worked on today\n" +
      "• /week — View your progress for this week (e.g. 4/5 days logged)\n" +
      "• /skills — See technical skills and tools captured so far\n" +
      "• /defense — Practice an oral defense panel question\n" +
      "• /settings — View working schedule and Telegram link\n" +
      "• /cancel — Cancel an active draft or setup in progress\n" +
      "• /unlink — Disconnect Telegram from your account\n\n" +
      "<i>Tip: You can tap the \"/\" menu button at the bottom of your screen anytime to view all commands.</i>",
      { parse_mode: "HTML", reply_markup: keyboard }
    );
  });

  // -------------------------------------------------------------
  // /today
  // -------------------------------------------------------------
  bot.command("today", async (ctx) => {
    await ctx.replyWithChatAction("typing");
    const userId = await linkedUser(ctx);
    if (!userId) {
      return ctx.reply(
        "You haven't set up your SIWES profile yet.",
        { reply_markup: new InlineKeyboard().text("🚀 Setup SIWES on Telegram", "onboard:start") }
      );
    }
    const programme = await input.programmes.findActiveByUser(userId);
    if (!programme) {
      return ctx.reply(
        "No active SIWES programme found.",
        { reply_markup: new InlineKeyboard().text("🚀 Setup SIWES on Telegram", "onboard:start") }
      );
    }
    const today = dateFromTimestampInTimeZone(new Date(), programme.timezone);
    const entry = await input.entries.findOwnedByDate(userId, programme.id, today);
    if (!entry) {
      return ctx.reply(
        `📝 <b>No entry recorded yet for today (${today}).</b>\n\nSend /log or tap below to capture your activity.`,
        {
          parse_mode: "HTML",
          reply_markup: new InlineKeyboard().text("✍️ Log Today's Work", "cmd:log")
        }
      );
    }

    const textToDisplay = entry.editedText ?? entry.generatedText ?? entry.rawText;
    const keyboard = new InlineKeyboard()
      .text("✏️ Edit Entry", `entry:edit:${entry.id}:${entry.version}`)
      .text("🔄 Re-draft", `entry:regenerate:${entry.id}`)
      .row()
      .text("📊 View Week", "cmd:week");

    return replyChunks(
      ctx,
      `📅 <b>Logbook Entry for ${today}</b>\n\n${escapeTelegramHtml(textToDisplay)}`,
      keyboard
    );
  });

  // -------------------------------------------------------------
  // /log
  // -------------------------------------------------------------
  bot.command("log", async (ctx) => {
    await ctx.replyWithChatAction("typing");
    const userId = await linkedUser(ctx);
    if (!userId) {
      return ctx.reply(
        "You need a SIWES profile before logging activities.",
        { reply_markup: new InlineKeyboard().text("🚀 Setup SIWES on Telegram", "onboard:start") }
      );
    }
    const programme = await input.programmes.findActiveByUser(userId);
    if (!programme) {
      return ctx.reply(
        "No active SIWES programme found.",
        { reply_markup: new InlineKeyboard().text("🚀 Setup SIWES on Telegram", "onboard:start") }
      );
    }
    const today = dateFromTimestampInTimeZone(new Date(), programme.timezone);
    await input.telegram.saveConversationState({
      userId,
      telegramChatId: String(ctx.chat.id),
      state: "AWAITING_ACTIVITY",
      payload: { programmeId: programme.id, workDate: today }
    });

    return ctx.reply(
      `✍️ <b>What did you work on today (${today})?</b>\n\n` +
      "Send a quick rough note or bullet points in your next message. For example:\n" +
      "<i>\"Configured Cisco switch ports, terminated CAT6 cables, attended weekly safety briefing\"</i>\n\n" +
      "SIWES Companion will structure it into a professional daily logbook entry.\n" +
      "<i>Send /cancel to stop.</i>",
      { parse_mode: "HTML" }
    );
  });

  // -------------------------------------------------------------
  // /week
  // -------------------------------------------------------------
  bot.command("week", async (ctx) => {
    await ctx.replyWithChatAction("typing");
    const userId = await linkedUser(ctx);
    if (!userId) return ctx.reply("Link or setup your SIWES profile first.", { reply_markup: new InlineKeyboard().text("🚀 Setup SIWES", "onboard:start") });
    const programme = await input.programmes.findActiveByUser(userId);
    if (!programme) return ctx.reply("No active programme found.");

    const today = dateFromTimestampInTimeZone(new Date(), programme.timezone);
    const { monday, friday } = getWeekBoundaries(today);
    const weekEntries = await input.entries.listForDateRange(userId, programme.id, monday, friday);

    const loggedCount = weekEntries.length;
    const progressPercent = Math.min(100, Math.round((loggedCount / 5) * 100));

    let summaryText = `📊 <b>Week of ${monday} to ${friday}</b>\n\n`;
    summaryText += `<b>Progress:</b> ${loggedCount} of 5 working days logged (${progressPercent}%)\n\n`;

    if (weekEntries.length === 0) {
      summaryText += "<i>No activities logged yet for this week. Keep your logbook up to date by logging daily!</i>";
    } else {
      summaryText += "<b>Logged Activities:</b>\n";
      for (const item of weekEntries) {
        const snippet = (item.editedText ?? item.generatedText ?? item.rawText).slice(0, 75).replace(/\n/g, " ");
        summaryText += `• <b>${item.workDate}:</b> ${escapeTelegramHtml(snippet)}...\n`;
      }
    }

    const keyboard = new InlineKeyboard()
      .text("✍️ Log Today", "cmd:log")
      .text("🎯 Mock Defense", "cmd:defense");

    return ctx.reply(summaryText, { parse_mode: "HTML", reply_markup: keyboard });
  });

  // -------------------------------------------------------------
  // /skills
  // -------------------------------------------------------------
  bot.command("skills", async (ctx) => {
    await ctx.replyWithChatAction("typing");
    const userId = await linkedUser(ctx);
    if (!userId) return ctx.reply("Setup your SIWES profile first.", { reply_markup: new InlineKeyboard().text("🚀 Setup SIWES", "onboard:start") });
    const programme = await input.programmes.findActiveByUser(userId);
    if (!programme) return ctx.reply("No active programme found.");

    const today = dateFromTimestampInTimeZone(new Date(), programme.timezone);
    const pastEntries = await input.entries.listForDateRange(userId, programme.id, programme.startDate, today);

    const allSkills = new Set<string>();
    const allTools = new Set<string>();

    for (const e of pastEntries) {
      if (e.structuredData?.skills) {
        for (const s of e.structuredData.skills) allSkills.add(s);
      }
      if (e.structuredData?.tools) {
        for (const t of e.structuredData.tools) allTools.add(t);
      }
    }

    if (allSkills.size === 0 && allTools.size === 0) {
      return ctx.reply(
        "🛠 <b>Skills & Tools</b>\n\nNo technical skills recorded yet. As you submit daily logs with /log, SIWES Companion automatically extracts your skills and tools!",
        { parse_mode: "HTML", reply_markup: new InlineKeyboard().text("✍️ Log Work Now", "cmd:log") }
      );
    }

    let message = "🛠 <b>Your Acquired Skills & Tools</b>\n\n";
    if (allSkills.size > 0) {
      message += "<b>Competencies Learned:</b>\n" + Array.from(allSkills).slice(0, 10).map((s) => `• ${escapeTelegramHtml(s)}`).join("\n") + "\n\n";
    }
    if (allTools.size > 0) {
      message += "<b>Tools & Equipment Used:</b>\n" + Array.from(allTools).slice(0, 10).map((t) => `• ${escapeTelegramHtml(t)}`).join("\n") + "\n";
    }

    return ctx.reply(message, {
      parse_mode: "HTML",
      reply_markup: new InlineKeyboard().text("🎯 Practice Defense", "cmd:defense")
    });
  });

  // -------------------------------------------------------------
  // /defense
  // -------------------------------------------------------------
  bot.command("defense", async (ctx) => {
    await ctx.replyWithChatAction("typing");
    const userId = await linkedUser(ctx);
    if (!userId) return ctx.reply("Setup your SIWES profile first.", { reply_markup: new InlineKeyboard().text("🚀 Setup SIWES", "onboard:start") });
    const programme = await input.programmes.findActiveByUser(userId);
    if (!programme) return ctx.reply("No active programme found.");

    const today = dateFromTimestampInTimeZone(new Date(), programme.timezone);
    const pastEntries = await input.entries.listForDateRange(userId, programme.id, programme.startDate, today);

    let panelQuestion = "Can you describe the primary technical challenge you encountered during your SIWES placement and how you resolved it?";
    if (pastEntries.length > 0) {
      const sample = pastEntries[Math.floor(Math.random() * pastEntries.length)];
      const textSnippet = (sample.editedText ?? sample.generatedText ?? sample.rawText).slice(0, 90);
      panelQuestion = `On ${sample.workDate}, you noted: "${textSnippet}...". Can you explain the practical principles behind this task to the panel?`;
    }

    const defenseKeyboard = new InlineKeyboard()
      .text("💡 Answering Hint", "defense:hint")
      .text("⏭️ Next Question", "defense:next");

    return ctx.reply(
      `🎓 <b>SIWES Oral Defense Practice</b>\n\n` +
      `<b>Panel Question:</b>\n<i>"${escapeTelegramHtml(panelQuestion)}"</i>\n\n` +
      `Prepare your oral response using the STAR technique (Situation, Task, Action, Result).`,
      { parse_mode: "HTML", reply_markup: defenseKeyboard }
    );
  });

  // -------------------------------------------------------------
  // /settings
  // -------------------------------------------------------------
  bot.command("settings", async (ctx) => {
    await ctx.replyWithChatAction("typing");
    const userId = await linkedUser(ctx);
    if (!userId) {
      return ctx.reply(
        "No SIWES account linked to this Telegram user.",
        { reply_markup: new InlineKeyboard().text("🚀 Setup SIWES on Telegram", "onboard:start") }
      );
    }
    const programme = await input.programmes.findActiveByUser(userId);
    const id = telegramUserId(ctx);

    const keyboard = new InlineKeyboard()
      .text("🔗 Disconnect Telegram", "settings:unlink_confirm");

    const text =
      `⚙️ <b>SIWES Companion Settings</b>\n\n` +
      (programme
        ? `🏛 <b>Institution:</b> ${escapeTelegramHtml(programme.institution)}\n` +
          `🏢 <b>Placement:</b> ${escapeTelegramHtml(programme.organization)}\n` +
          `⏱ <b>Duration:</b> ${programme.durationMonths} Months\n` +
          `📅 <b>Dates:</b> ${programme.startDate} to ${programme.endDate}\n` +
          `🌐 <b>Timezone:</b> ${programme.timezone}\n` +
          `📅 <b>Working Days:</b> Monday – Friday\n\n`
        : "<i>No active SIWES programme found.</i>\n\n") +
      `👤 <b>Telegram ID:</b> <code>${id}</code>\n` +
      `🔗 <b>Status:</b> Connected`;

    return ctx.reply(text, { parse_mode: "HTML", reply_markup: keyboard });
  });

  // -------------------------------------------------------------
  // /unlink
  // -------------------------------------------------------------
  bot.command("unlink", async (ctx) => {
    const keyboard = new InlineKeyboard()
      .text("⚠️ Yes, Disconnect", "settings:unlink_exec")
      .text("❌ Cancel", "cmd:cancel");

    return ctx.reply(
      "Are you sure you want to disconnect this Telegram chat from your SIWES Companion account? Your logbook entries will remain safe on the database.",
      { reply_markup: keyboard }
    );
  });

  // -------------------------------------------------------------
  // /cancel
  // -------------------------------------------------------------
  bot.command("cancel", async (ctx) => {
    const userId = await linkedUser(ctx);
    if (userId) await input.telegram.clearConversationState(userId);
    return ctx.reply("Active draft or flow cancelled. Nothing was deleted.", {
      reply_markup: new InlineKeyboard().text("✍️ Log Work", "cmd:log").text("📅 View Today", "cmd:today")
    });
  });

  // -------------------------------------------------------------
  // Message Handler (Onboarding + Activity Drafts + Edits)
  // -------------------------------------------------------------
  bot.on("message:text", async (ctx) => {
    const id = telegramUserId(ctx);
    if (!id) return;

    let userId = await input.telegram.findUserIdByTelegramUser(id);
    if (!userId) {
      userId = await input.telegram.findOrCreateUserByTelegramUser(id, {
        username: ctx.from?.username,
        firstName: ctx.from?.first_name
      });
    }

    async function processActivityNote(
      ctx: Context,
      userId: string,
      programmeId: string,
      workDate: `${number}-${number}-${number}`,
      noteText: string
    ) {
      if (noteText.length < 3) {
        return ctx.reply("Your note is too short. Please provide at least a few words describing what you did.");
      }

      await ctx.replyWithChatAction("typing");
      try {
        const entry = await captureDailyNote(input.entries, {
          userId,
          programmeId,
          workDate,
          rawText: noteText,
          source: "TELEGRAM"
        });

        await ctx.reply("🤖 <i>Formatting your logbook entry with AI...</i>", { parse_mode: "HTML" });
        await ctx.replyWithChatAction("typing");

        const generated = await generateEntry(input.entries, input.generator, userId, entry.id);
        await input.telegram.clearConversationState(userId);

        const keyboard = new InlineKeyboard()
          .text("✅ Save Entry", `entry:save:${generated.id}:${generated.version}`)
          .text("✏️ Edit Text", `entry:edit:${generated.id}:${generated.version}`)
          .row()
          .text("🔄 Re-generate", `entry:regenerate:${generated.id}`);

        let replyMessage = `✨ <b>AI Grounded Draft (${workDate})</b>\n\n${escapeTelegramHtml(generated.generatedText ?? generated.rawText)}`;

        if (generated.generationStatus === "NEEDS_CLARIFICATION") {
          replyMessage += `\n\n<i>Note: You can add more details with Edit Text or save this draft directly.</i>`;
        } else {
          replyMessage += `\n\n<i>Review this draft. You can approve it as-is or tap Edit Text to adjust.</i>`;
        }

        return replyChunks(ctx, replyMessage, keyboard);
      } catch (error) {
        console.error("Error generating entry on Telegram:", error);
        return ctx.reply(
          error instanceof AppError
            ? `⚠️ ${error.message}`
            : "I could not create a draft right now. Your note was saved; you can try again."
        );
      }
    }

    const state = await input.telegram.getConversationState(userId);
    const text = ctx.message.text.trim();

    if (!state) {
      const programme = await input.programmes.findActiveByUser(userId);
      if (!programme) {
        return ctx.reply(
          "👋 You haven't set up your SIWES profile yet.\n\nTap below to set up your profile or link your web account:",
          {
            reply_markup: new InlineKeyboard()
              .text("🚀 Setup SIWES on Telegram", "onboard:start")
              .row()
              .text("🔗 Link Web Account", "onboard:link")
          }
        );
      }

      const today = dateFromTimestampInTimeZone(new Date(), programme.timezone);
      const lower = text.toLowerCase().trim();

      // Check if user typed "log", "log today", "log today's entry", etc.
      if (
        lower === "log" ||
        lower === "log today" ||
        lower === "log today's entry" ||
        lower === "log entry" ||
        lower === "log work" ||
        lower === "record" ||
        lower === "entry"
      ) {
        await input.telegram.saveConversationState({
          userId,
          telegramChatId: String(ctx.chat.id),
          state: "AWAITING_ACTIVITY",
          payload: { programmeId: programme.id, workDate: today }
        });
        return ctx.reply(
          `✍️ <b>What did you work on today (${today})?</b>\n\n` +
          "Send your rough notes or bullet points in your next message. For example:\n" +
          "<i>\"Configured network switch ports, terminated CAT6 cables, attended team standup\"</i>\n\n" +
          "SIWES Companion will structure it into a professional daily logbook entry.\n" +
          "<i>Send /cancel to stop.</i>",
          { parse_mode: "HTML" }
        );
      }

      // Check for prefixed logs, e.g. "log today: I worked on..." or "log: I worked on..."
      const logPrefixMatch = text.match(/^(?:log(?:\s+today(?:'s)?(?:\s+entry)?)?|\/log)[\s:]+(.+)$/i);
      if (logPrefixMatch && logPrefixMatch[1]?.trim().length >= 3) {
        return processActivityNote(ctx, userId, programme.id, today, logPrefixMatch[1].trim());
      }

      if (lower === "today" || lower === "status") {
        const entry = await input.entries.findOwnedByDate(userId, programme.id, today);
        if (!entry) {
          return ctx.reply(`📝 <b>No entry recorded yet for today (${today}).</b>\n\nSend /log or tap below to capture your activity:`, {
            parse_mode: "HTML",
            reply_markup: new InlineKeyboard().text("✍️ Log Today's Work", "cmd:log")
          });
        }
        return replyChunks(
          ctx,
          `📅 <b>Logbook Entry for ${today}</b>\n\n${escapeTelegramHtml(entry.editedText ?? entry.generatedText ?? entry.rawText)}`,
          new InlineKeyboard().text("✏️ Edit Entry", `entry:edit:${entry.id}:${entry.version}`)
        );
      }

      if (lower === "week" || lower === "this week") {
        const { monday, friday } = getWeekBoundaries(today);
        const weekEntries = await input.entries.listForDateRange(userId, programme.id, monday, friday);
        return ctx.reply(
          `📊 <b>Week of ${monday} to ${friday}</b>\n\n<b>Progress:</b> ${weekEntries.length} of 5 working days logged\n\n` +
          (weekEntries.length === 0 ? "<i>No entries logged this week.</i>" : weekEntries.map((e) => `• <b>${e.workDate}:</b> ${(e.editedText ?? e.generatedText ?? e.rawText).slice(0, 70)}...`).join("\n")),
          { parse_mode: "HTML", reply_markup: new InlineKeyboard().text("✍️ Log Today", "cmd:log") }
        );
      }

      if (lower === "hi" || lower === "hello" || lower === "hey" || lower === "start") {
        return ctx.reply(
          `👋 <b>Welcome${ctx.from?.first_name ? `, ${ctx.from.first_name}` : ""}!</b>\n\n` +
          `Ready to document your industrial training today (${today})?\n\n` +
          "You can send your daily notes directly to this chat, or choose an option below:",
          {
            parse_mode: "HTML",
            reply_markup: new InlineKeyboard()
              .text("✍️ Log Today's Work", "cmd:log")
              .text("📅 Today's Status", "cmd:today")
              .row()
              .text("📊 This Week", "cmd:week")
              .text("🎯 Practice Defense", "cmd:defense")
          }
        );
      }

      if (lower === "help") {
        return ctx.reply("Send /help to see all commands and instructions.");
      }

      // Default: the user sent their daily work note directly!
      return processActivityNote(ctx, userId, programme.id, today, text);
    }

    // Onboarding Step 1: Institution
    if (state.state === "ONBOARDING_INSTITUTION") {
      if (text.length < 2) return ctx.reply("Please enter the full name of your university or polytechnic:");
      await input.telegram.saveConversationState({
        userId,
        telegramChatId: String(ctx.chat.id),
        state: "ONBOARDING_DEPARTMENT",
        payload: { institution: text }
      });
      return ctx.reply(
        `🏛 <b>Institution:</b> ${escapeTelegramHtml(text)}\n\n` +
        `📚 <b>Step 2 of 5: Department / Course of Study</b>\n\n` +
        `What course are you studying?\n` +
        `<i>(e.g., Computer Engineering, Electrical, Biochemistry)</i>`,
        { parse_mode: "HTML" }
      );
    }

    // Onboarding Step 2: Department
    if (state.state === "ONBOARDING_DEPARTMENT") {
      const payload = state.payload as { institution: string };
      if (text.length < 2) return ctx.reply("Please enter your department or course of study:");
      await input.telegram.saveConversationState({
        userId,
        telegramChatId: String(ctx.chat.id),
        state: "ONBOARDING_MATRIC",
        payload: { ...payload, department: text }
      });
      return ctx.reply(
        `📚 <b>Department:</b> ${escapeTelegramHtml(text)}\n\n` +
        `🎓 <b>Step 3 of 5: Matriculation / Registration Number</b>\n\n` +
        `What is your matric number?\n` +
        `<i>(e.g., ENG1904234, U2021/301004)</i>`,
        { parse_mode: "HTML" }
      );
    }

    // Onboarding Step 3: Matric Number
    if (state.state === "ONBOARDING_MATRIC") {
      const payload = state.payload as { institution: string; department: string };
      if (text.length < 2) return ctx.reply("Please enter your matriculation number:");
      await input.telegram.saveConversationState({
        userId,
        telegramChatId: String(ctx.chat.id),
        state: "ONBOARDING_ORGANIZATION",
        payload: { ...payload, matricNumber: text }
      });
      return ctx.reply(
        `🎓 <b>Matric No:</b> ${escapeTelegramHtml(text)}\n\n` +
        `🏢 <b>Step 4 of 5: Company / Placement Organization</b>\n\n` +
        `Where are you carrying out your SIWES training? Include your department/unit if known.\n` +
        `<i>(e.g., Dangote Sugar Refinery - Quality Assurance, or Chevron - IT Infrastructure)</i>`,
        { parse_mode: "HTML" }
      );
    }

    // Onboarding Step 4: Organization & Unit
    if (state.state === "ONBOARDING_ORGANIZATION") {
      const payload = state.payload as { institution: string; department: string; matricNumber: string };
      if (text.length < 2) return ctx.reply("Please enter the organization name:");
      const parts = text.split(/[-–—,]/).map((p) => p.trim());
      const organization = parts[0] || text;
      const unit = parts.slice(1).join(" - ") || "Industrial Training Unit";

      await input.telegram.saveConversationState({
        userId,
        telegramChatId: String(ctx.chat.id),
        state: "ONBOARDING_DURATION",
        payload: { ...payload, organization, unit }
      });

      const keyboard = new InlineKeyboard()
        .text("3 Months (12 Weeks)", "onboard:duration:3")
        .row()
        .text("6 Months (24 Weeks)", "onboard:duration:6");

      return ctx.reply(
        `🏢 <b>Placement:</b> ${escapeTelegramHtml(organization)} (${escapeTelegramHtml(unit)})\n\n` +
        `⏱ <b>Step 5 of 5: Duration of Industrial Training</b>\n\n` +
        `Select how long your SIWES programme lasts:`,
        { parse_mode: "HTML", reply_markup: keyboard }
      );
    }

    // Awaiting Edit Text
    if (state.state === "AWAITING_EDIT") {
      const editPayload = state.payload as { entryId?: string; expectedVersion?: number };
      if (!editPayload.entryId || !editPayload.expectedVersion) {
        return ctx.reply("This edit session has expired. Start again with /log.");
      }
      try {
        await ctx.replyWithChatAction("typing");
        await saveEditedEntry(input.entries, {
          userId,
          entryId: editPayload.entryId,
          editedText: text,
          expectedVersion: editPayload.expectedVersion
        });
        await input.telegram.clearConversationState(userId);
        return ctx.reply("✅ <b>Saved your edited entry.</b>", {
          parse_mode: "HTML",
          reply_markup: new InlineKeyboard().text("📅 View Today", "cmd:today").text("📊 View Week", "cmd:week")
        });
      } catch (error) {
        return ctx.reply(error instanceof AppError ? error.message : "Could not save that edit.");
      }
    }

    // Awaiting Daily Activity Note
    if (state.state === "AWAITING_ACTIVITY") {
      const payload = state.payload as { programmeId?: string; workDate?: `${number}-${number}-${number}` };
      if (!payload.programmeId || !payload.workDate) {
        return ctx.reply("This draft session expired. Start again with /log.");
      }
      return processActivityNote(ctx, userId, payload.programmeId, payload.workDate, text);
    }
  });

  // -------------------------------------------------------------
  // Callback Queries
  // -------------------------------------------------------------
  bot.callbackQuery(/^entry:(save|edit|regenerate):([^:]+)(?::(\d+))?$/, async (ctx) => {
    const userId = await linkedUser(ctx);
    if (!userId) return ctx.answerCallbackQuery({ text: "Link your account first.", show_alert: true });
    const match = ctx.callbackQuery.data.match(/^entry:(save|edit|regenerate):([^:]+)(?::(\d+))?$/);
    if (!match) return ctx.answerCallbackQuery({ text: "Invalid action.", show_alert: true });
    const [, action, entryId, version] = match;

    try {
      if (action === "save") {
        const entry = await input.entries.findOwnedById(userId, entryId);
        if (!entry) throw new AppError("NOT_FOUND", "Entry not found");
        await saveEditedEntry(input.entries, {
          userId,
          entryId,
          editedText: entry.generatedText ?? entry.rawText,
          expectedVersion: Number(version)
        });
        await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
        await ctx.answerCallbackQuery({ text: "Entry saved successfully!" });
        return ctx.reply("✅ <b>Entry finalized and saved in your logbook.</b>", {
          parse_mode: "HTML",
          reply_markup: new InlineKeyboard().text("📅 View Today", "cmd:today").text("📊 View Week", "cmd:week")
        });
      }
      if (action === "edit") {
        await input.telegram.saveConversationState({
          userId,
          telegramChatId: String(ctx.chat?.id ?? ""),
          state: "AWAITING_EDIT",
          payload: { entryId, expectedVersion: Number(version) }
        });
        await ctx.answerCallbackQuery({ text: "Send the corrected text in your next message." });
        return ctx.reply("Send the corrected entry text now. I will save it against this draft.");
      }
      if (action === "regenerate") {
        await ctx.answerCallbackQuery({ text: "Regenerating..." });
        await ctx.replyWithChatAction("typing");
        const regenerated = await generateEntry(input.entries, input.generator, userId, entryId);
        const keyboard = new InlineKeyboard()
          .text("✅ Save Entry", `entry:save:${regenerated.id}:${regenerated.version}`)
          .text("✏️ Edit Text", `entry:edit:${regenerated.id}:${regenerated.version}`);
        return replyChunks(
          ctx,
          `✨ <b>Regenerated Draft</b>\n\n${escapeTelegramHtml(regenerated.generatedText ?? regenerated.rawText)}`,
          keyboard
        );
      }
    } catch (error) {
      await ctx.answerCallbackQuery({ text: error instanceof AppError ? error.message : "Could not update this entry.", show_alert: true });
    }
  });

  // Onboarding Start
  bot.callbackQuery("onboard:start", async (ctx) => {
    const id = telegramUserId(ctx);
    if (!id) return;
    const userId = await input.telegram.findOrCreateUserByTelegramUser(id, {
      username: ctx.from?.username,
      firstName: ctx.from?.first_name
    });

    await input.telegram.saveConversationState({
      userId,
      telegramChatId: String(ctx.chat?.id ?? ""),
      state: "ONBOARDING_INSTITUTION",
      payload: { step: 1 }
    });

    await ctx.answerCallbackQuery();
    return ctx.reply(
      "🚀 <b>SIWES Setup — Step 1 of 5</b>\n\n" +
      "What higher institution (university or polytechnic) do you attend?\n" +
      "<i>(e.g., University of Lagos, Covenant University, FUTO)</i>\n\n" +
      "<i>Send /cancel at any time to exit.</i>",
      { parse_mode: "HTML" }
    );
  });

  // Onboarding Link Instructions
  bot.callbackQuery("onboard:link", async (ctx) => {
    await ctx.answerCallbackQuery();
    return ctx.reply(
      "🔗 <b>Linking to Web Account</b>\n\n" +
      "1. Open your SIWES Companion dashboard on your browser\n" +
      "2. Go to <b>Settings → Telegram Link</b>\n" +
      "3. Click <b>\"Generate Link\"</b> and tap the Telegram link provided\n\n" +
      "This will automatically connect your web account to this chat!",
      { parse_mode: "HTML" }
    );
  });

  // Onboarding About
  bot.callbackQuery("onboard:about", async (ctx) => {
    await ctx.answerCallbackQuery();
    const keyboard = new InlineKeyboard()
      .text("🚀 Setup SIWES on Telegram", "onboard:start")
      .row()
      .text("🔗 Link Web Account", "onboard:link");

    return ctx.reply(
      "📖 <b>About SIWES Companion</b>\n\n" +
      "SIWES Companion helps Nigerian tertiary students document their Industrial Training efficiently:\n\n" +
      "• <b>Authentic Logbooks:</b> AI polishes your raw bullet points into formal engineering/scientific language without making up fake tasks\n" +
      "• <b>Dual Web & Telegram:</b> Log on the go from your phone, compile full PDF reports on your laptop\n" +
      "• <b>Mock Oral Defense:</b> Answer simulated panel questions grounded in your actual logged activities\n\n" +
      "Ready to start?",
      { parse_mode: "HTML", reply_markup: keyboard }
    );
  });

  // Onboarding Duration Selection (3 or 6 months)
  bot.callbackQuery(/^onboard:duration:(3|6)$/, async (ctx) => {
    const id = telegramUserId(ctx);
    if (!id) return;
    const userId = await input.telegram.findUserIdByTelegramUser(id);
    if (!userId) return ctx.answerCallbackQuery({ text: "Session expired. Start with /start", show_alert: true });

    const state = await input.telegram.getConversationState(userId);
    if (!state || state.state !== "ONBOARDING_DURATION") {
      return ctx.answerCallbackQuery({ text: "Session expired. Start with /start", show_alert: true });
    }

    const durationMonths = ctx.callbackQuery.data === "6" ? 6 : 3;
    const payload = state.payload as {
      institution: string;
      department: string;
      matricNumber: string;
      organization: string;
      unit: string;
    };

    try {
      await ctx.answerCallbackQuery({ text: "Creating your SIWES profile..." });
      await ctx.replyWithChatAction("typing");

      const now = new Date();
      const startYear = now.getFullYear();
      const startMonth = now.getMonth();
      const startDate = parseDateOnly(`${startYear}-${String(startMonth + 1).padStart(2, "0")}-01`);

      const endMonthDate = new Date(Date.UTC(startYear, startMonth + durationMonths, 0));
      const endDate = parseDateOnly(
        `${endMonthDate.getUTCFullYear()}-${String(endMonthDate.getUTCMonth() + 1).padStart(2, "0")}-${String(endMonthDate.getUTCDate()).padStart(2, "0")}`
      );

      await createProgramme(input.programmes, {
        userId,
        durationMonths,
        institution: payload.institution,
        department: payload.department,
        level: durationMonths === 6 ? "400 Level" : "300 Level",
        matricNumber: payload.matricNumber,
        organization: payload.organization,
        unit: payload.unit,
        startDate,
        endDate,
        timezone: "Africa/Lagos",
        workingWeekdays: [1, 2, 3, 4, 5]
      });

      await input.telegram.clearConversationState(userId);

      const successKeyboard = new InlineKeyboard()
        .text("✍️ Log Today's Work", "cmd:log")
        .text("📅 View Today", "cmd:today")
        .row()
        .text("📊 Weekly Rollup", "cmd:week")
        .text("🎯 Mock Defense", "cmd:defense");

      await ctx.reply(
        "🎉 <b>You're All Set! Your SIWES Profile is Ready.</b>\n\n" +
        `🏛 <b>Institution:</b> ${escapeTelegramHtml(payload.institution)}\n` +
        `📚 <b>Department:</b> ${escapeTelegramHtml(payload.department)}\n` +
        `🏢 <b>Placement:</b> ${escapeTelegramHtml(payload.organization)} (${escapeTelegramHtml(payload.unit)})\n` +
        `⏱ <b>Duration:</b> ${durationMonths} Months (${startDate} to ${endDate})\n` +
        `📅 <b>Schedule:</b> Monday – Friday\n\n` +
        "You can now submit your daily activity notes directly from Telegram! Tap below to start:",
        { parse_mode: "HTML", reply_markup: successKeyboard }
      );
    } catch (error) {
      await ctx.reply(error instanceof AppError ? error.message : "Failed to set up programme. Try /start again.");
    }
  });

  // Defense Hint
  bot.callbackQuery("defense:hint", async (ctx) => {
    await ctx.answerCallbackQuery();
    return ctx.reply(
      "💡 <b>Defense Answering Tip (STAR Method)</b>\n\n" +
      "• <b>Situation:</b> Describe the specific context, problem, or equipment\n" +
      "• <b>Task:</b> What was your direct responsibility or objective?\n" +
      "• <b>Action:</b> Detail the exact technical steps and tools you applied\n" +
      "• <b>Result:</b> Share the measurable outcome, test result, or what you learned\n\n" +
      "<i>Keep your tone confident, clear, and grounded in your authentic training.</i>",
      { parse_mode: "HTML" }
    );
  });

  // Defense Next
  bot.callbackQuery("defense:next", async (ctx) => {
    await ctx.answerCallbackQuery();
    const userId = await linkedUser(ctx);
    if (!userId) return ctx.reply("Link your account first.");
    const programme = await input.programmes.findActiveByUser(userId);
    if (!programme) return ctx.reply("No active programme found.");

    await ctx.replyWithChatAction("typing");
    const questions = [
      "Can you explain the safety precautions and PPE requirements observed at your workplace?",
      "What industry tools, software, or machinery did you operate, and how did you verify their operational standards?",
      "Describe a situation where a procedure did not go as expected and how you troubleshot the issue.",
      "How did your theoretical classroom knowledge connect with the practical tasks performed during SIWES?",
      "If you were to optimize one operational workflow at your host organization, what would you improve?"
    ];
    const picked = questions[Math.floor(Math.random() * questions.length)];

    const defenseKeyboard = new InlineKeyboard()
      .text("💡 Answering Hint", "defense:hint")
      .text("⏭️ Another Question", "defense:next");

    return ctx.reply(
      `🎓 <b>SIWES Oral Defense Practice</b>\n\n` +
      `<b>Panel Question:</b>\n<i>"${escapeTelegramHtml(picked)}"</i>`,
      { parse_mode: "HTML", reply_markup: defenseKeyboard }
    );
  });

  // Command Shortcuts from Keyboards
  bot.callbackQuery(/^cmd:(today|log|week|skills|defense|settings|help|cancel)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const cmd = ctx.callbackQuery.data.replace("cmd:", "");

    if (cmd === "log") {
      const userId = await linkedUser(ctx);
      if (!userId) return ctx.reply("Link or setup your SIWES profile first.", { reply_markup: new InlineKeyboard().text("🚀 Setup SIWES", "onboard:start") });
      const programme = await input.programmes.findActiveByUser(userId);
      if (!programme) return ctx.reply("No active programme found.", { reply_markup: new InlineKeyboard().text("🚀 Setup SIWES", "onboard:start") });
      const today = dateFromTimestampInTimeZone(new Date(), programme.timezone);
      await input.telegram.saveConversationState({
        userId,
        telegramChatId: String(ctx.chat?.id ?? ""),
        state: "AWAITING_ACTIVITY",
        payload: { programmeId: programme.id, workDate: today }
      });
      return ctx.reply(`✍️ <b>What did you work on today (${today})?</b>\n\nSend a quick rough note or bullet points in your next message. Send /cancel to stop.`, { parse_mode: "HTML" });
    }
    if (cmd === "today") {
      const userId = await linkedUser(ctx);
      if (!userId) return ctx.reply("Link or setup your SIWES profile first.");
      const programme = await input.programmes.findActiveByUser(userId);
      if (!programme) return ctx.reply("No active programme found.");
      const today = dateFromTimestampInTimeZone(new Date(), programme.timezone);
      const entry = await input.entries.findOwnedByDate(userId, programme.id, today);
      if (!entry) {
        return ctx.reply(`📝 No entry recorded yet for ${today}. Tap below to log:`, {
          reply_markup: new InlineKeyboard().text("✍️ Log Today's Work", "cmd:log")
        });
      }
      return replyChunks(ctx, `📅 <b>Logbook Entry for ${today}</b>\n\n${escapeTelegramHtml(entry.editedText ?? entry.generatedText ?? entry.rawText)}`, new InlineKeyboard().text("✏️ Edit Entry", `entry:edit:${entry.id}:${entry.version}`));
    }
    if (cmd === "week") {
      const userId = await linkedUser(ctx);
      if (!userId) return ctx.reply("Link or setup your SIWES profile first.");
      const programme = await input.programmes.findActiveByUser(userId);
      if (!programme) return ctx.reply("No active programme found.");
      const today = dateFromTimestampInTimeZone(new Date(), programme.timezone);
      const { monday, friday } = getWeekBoundaries(today);
      const weekEntries = await input.entries.listForDateRange(userId, programme.id, monday, friday);
      const loggedCount = weekEntries.length;
      return ctx.reply(
        `📊 <b>Week of ${monday} to ${friday}</b>\n\n<b>Progress:</b> ${loggedCount} of 5 working days logged\n\n` +
        (weekEntries.length === 0 ? "<i>No entries logged this week.</i>" : weekEntries.map((e) => `• <b>${e.workDate}:</b> ${(e.editedText ?? e.generatedText ?? e.rawText).slice(0, 70)}...`).join("\n")),
        { parse_mode: "HTML", reply_markup: new InlineKeyboard().text("✍️ Log Today", "cmd:log") }
      );
    }
    if (cmd === "defense") {
      return ctx.reply(
        "🎓 <b>SIWES Oral Defense Practice</b>\n\n" +
        "<b>Panel Question:</b>\n<i>\"Can you describe the primary technical challenge you encountered during your SIWES placement and how you resolved it?\"</i>",
        { parse_mode: "HTML", reply_markup: new InlineKeyboard().text("💡 Answering Hint", "defense:hint").text("⏭️ Next Question", "defense:next") }
      );
    }
    if (cmd === "settings") {
      const userId = await linkedUser(ctx);
      if (!userId) return ctx.reply("No SIWES account linked.");
      const programme = await input.programmes.findActiveByUser(userId);
      return ctx.reply(
        `⚙️ <b>Settings</b>\n\n` +
        (programme ? `🏛 <b>Institution:</b> ${programme.institution}\n🏢 <b>Placement:</b> ${programme.organization}\n⏱ <b>Duration:</b> ${programme.durationMonths} Months` : "No active programme."),
        { parse_mode: "HTML", reply_markup: new InlineKeyboard().text("🔗 Disconnect Telegram", "settings:unlink_confirm") }
      );
    }
    if (cmd === "help") {
      return ctx.reply("Send /help to see all commands and instructions.");
    }
    if (cmd === "cancel") {
      const userId = await linkedUser(ctx);
      if (userId) await input.telegram.clearConversationState(userId);
      return ctx.reply("Cancelled.");
    }
  });

  // Settings Unlink Confirm & Execute
  bot.callbackQuery("settings:unlink_confirm", async (ctx) => {
    await ctx.answerCallbackQuery();
    return ctx.reply(
      "Are you sure you want to disconnect this Telegram account from SIWES Companion?",
      {
        reply_markup: new InlineKeyboard()
          .text("⚠️ Yes, Disconnect", "settings:unlink_exec")
          .text("❌ Cancel", "cmd:cancel")
      }
    );
  });

  bot.callbackQuery("settings:unlink_exec", async (ctx) => {
    const id = telegramUserId(ctx);
    if (!id) return;
    await input.telegram.unlinkTelegramUser(id);
    await ctx.answerCallbackQuery({ text: "Telegram disconnected." });
    return ctx.reply(
      "<b>Telegram account unlinked.</b>\n\nYour data remains safe on your web account. You can reconnect anytime with /start or from Settings.",
      { parse_mode: "HTML", reply_markup: new InlineKeyboard().text("🚀 Setup New Profile", "onboard:start") }
    );
  });

  return bot;
}

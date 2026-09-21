import { Bot, InlineKeyboard, type Context } from "grammy";
import { AppError } from "@/src/core/shared/errors";
import { dateFromTimestampInTimeZone } from "@/src/core/shared/date";
import { captureDailyNote, generateEntry, saveEditedEntry } from "@/src/core/entries/entry-service";
import type { EntryRepository } from "@/src/core/entries/types";
import type { DailyEntryGenerator } from "@/src/core/entries/types";
import type { ProgrammeRepository } from "@/src/core/siwes/types";
import { consumeTelegramLinkToken } from "@/src/core/telegram/link-service";
import { escapeTelegramHtml, chunkTelegramText } from "@/src/adapters/telegram/format";
import type { PrismaTelegramRepository } from "@/src/adapters/telegram/prisma-telegram-repository";

type TelegramRepository = PrismaTelegramRepository & {
  findUserIdByTelegramUser(id: string): Promise<string | null>;
  getConversationState(userId: string): Promise<{ state: string; payload: unknown } | null>;
  clearConversationState(userId: string): Promise<void>;
};

function telegramUserId(ctx: Context): string | null {
  return ctx.from?.id ? String(ctx.from.id) : null;
}

async function replyChunks(ctx: Context, text: string, keyboard?: InlineKeyboard) {
  const chunks = chunkTelegramText(text);
  for (const [index, chunk] of chunks.entries()) {
    await ctx.reply(chunks.length > 1 ? `${index + 1}/${chunks.length}\n${chunk}` : chunk, { parse_mode: "HTML", reply_markup: index === chunks.length - 1 ? keyboard : undefined });
  }
}

export function createTelegramBot(input: { token: string; telegram: TelegramRepository; entries: EntryRepository; programmes: ProgrammeRepository; generator: DailyEntryGenerator }) {
  const bot = new Bot(input.token);

  async function linkedUser(ctx: Context) {
    const id = telegramUserId(ctx);
    return id ? input.telegram.findUserIdByTelegramUser(id) : null;
  }

  bot.command("start", async (ctx) => {
    const token = ctx.match?.trim();
    const id = telegramUserId(ctx);
    if (!id) return;
    if (token) {
      try {
        await consumeTelegramLinkToken(input.telegram, token, id, { username: ctx.from?.username, firstName: ctx.from?.first_name });
        await ctx.reply("<b>Telegram linked.</b> Your SIWES record is ready here. Try /today.", { parse_mode: "HTML" });
      } catch (error) {
        await ctx.reply(error instanceof AppError ? error.message : "That link is no longer valid. Start a new link from the web app.");
      }
      return;
    }
    await ctx.reply("Welcome. Open SIWES Companion on the web to link this Telegram account, or use /help.");
  });

  bot.command("help", async (ctx) => ctx.reply("<b>SIWES Companion</b>\n/today status\n/log capture an activity\n/week review this week\n/cancel clear the current draft\n/unlink remove this Telegram link", { parse_mode: "HTML" }));

  bot.command("today", async (ctx) => {
    const userId = await linkedUser(ctx);
    if (!userId) return ctx.reply("Link your account from the web app first.");
    const programme = await input.programmes.findActiveByUser(userId);
    if (!programme) return ctx.reply("Create a SIWES programme on the web app first.");
    const today = dateFromTimestampInTimeZone(new Date(), programme.timezone);
    const entry = await input.entries.findOwnedByDate(userId, programme.id, today);
    if (!entry) return ctx.reply(`No entry yet for ${today}. Send /log to start.`);
    return replyChunks(ctx, `<b>${today}</b>\n${escapeTelegramHtml(entry.editedText ?? entry.generatedText ?? entry.rawText)}`, new InlineKeyboard().text("Edit", `entry:edit:${entry.id}:${entry.version}`));
  });

  bot.command("log", async (ctx) => {
    const userId = await linkedUser(ctx);
    if (!userId) return ctx.reply("Link your account from the web app first.");
    const programme = await input.programmes.findActiveByUser(userId);
    if (!programme) return ctx.reply("Create a SIWES programme on the web app first.");
    const today = dateFromTimestampInTimeZone(new Date(), programme.timezone);
    await input.telegram.saveConversationState({ userId, telegramChatId: String(ctx.chat.id), state: "AWAITING_ACTIVITY", payload: { programmeId: programme.id, workDate: today } });
    return ctx.reply("What did you do? A rough note is fine. Send /cancel to stop.");
  });

  bot.command("cancel", async (ctx) => {
    const userId = await linkedUser(ctx);
    if (userId) await input.telegram.clearConversationState(userId);
    return ctx.reply("Okay. Nothing was deleted.");
  });

  bot.on("message:text", async (ctx) => {
    const userId = await linkedUser(ctx);
    if (!userId) return;
    const state = await input.telegram.getConversationState(userId);
    if (!state || !["AWAITING_ACTIVITY", "AWAITING_EDIT"].includes(state.state)) return;
    if (state.state === "AWAITING_EDIT") {
      const editPayload = state.payload as { entryId?: string; expectedVersion?: number };
      if (!editPayload.entryId || !editPayload.expectedVersion) return ctx.reply("This edit expired. Start again with /log.");
      try {
        await saveEditedEntry(input.entries, { userId, entryId: editPayload.entryId, editedText: ctx.message.text, expectedVersion: editPayload.expectedVersion });
        await input.telegram.clearConversationState(userId);
        return ctx.reply("Saved your edited entry.");
      } catch (error) {
        return ctx.reply(error instanceof AppError ? error.message : "I could not save that edit.");
      }
    }
    const payload = state.payload as { programmeId?: string; workDate?: `${number}-${number}-${number}` };
    if (!payload.programmeId || !payload.workDate) return ctx.reply("This draft expired. Start again with /log.");
    try {
      const entry = await captureDailyNote(input.entries, { userId, programmeId: payload.programmeId, workDate: payload.workDate, rawText: ctx.message.text, source: "TELEGRAM" });
      const generated = await generateEntry(input.entries, input.generator, userId, entry.id);
      await input.telegram.clearConversationState(userId);
      return replyChunks(ctx, `<b>AI draft</b>\n${escapeTelegramHtml(generated.generatedText ?? generated.rawText)}\n\nReview before saving.`, new InlineKeyboard().text("Save", `entry:save:${generated.id}:${generated.version}`).text("Edit", `entry:edit:${generated.id}:${generated.version}`).row().text("Regenerate", `entry:regenerate:${generated.id}`));
    } catch (error) {
      return ctx.reply(error instanceof AppError ? error.message : "I could not create a draft. Your raw note may still be saved; try again.");
    }
  });

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
        await saveEditedEntry(input.entries, { userId, entryId, editedText: entry.generatedText ?? entry.rawText, expectedVersion: Number(version) });
        await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
        return ctx.answerCallbackQuery({ text: "Saved" });
      }
      if (action === "edit") {
        await input.telegram.saveConversationState({ userId, telegramChatId: String(ctx.chat?.id ?? ""), state: "AWAITING_EDIT", payload: { entryId, expectedVersion: Number(version) } });
        await ctx.answerCallbackQuery({ text: "Send the corrected text in your next message." });
        return ctx.reply("Send the corrected entry text now. I will save it against this draft.");
      }
      await ctx.answerCallbackQuery({ text: "Use /log to capture a fresh version." });
    } catch (error) {
      await ctx.answerCallbackQuery({ text: error instanceof AppError ? error.message : "Could not update this entry.", show_alert: true });
    }
  });

  return bot;
}

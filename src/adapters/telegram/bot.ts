import { Bot, GrammyError, type Context } from "grammy";
import { AppError } from "@/src/core/shared/errors";
import { dateFromTimestampInTimeZone, parseDateOnly, type DateOnly } from "@/src/core/shared/date";
import { captureDailyNote, generateEntry, saveEditedEntry } from "@/src/core/entries/entry-service";
import type { DailyEntryGenerator, Entry, EntryRepository } from "@/src/core/entries/types";
import type { Programme, ProgrammeRepository } from "@/src/core/siwes/types";
import { createProgramme } from "@/src/core/siwes/siwes-service";
import { consumeTelegramLinkToken } from "@/src/core/telegram/link-service";
import type { PrismaTelegramRepository } from "@/src/adapters/telegram/prisma-telegram-repository";
import type { TelegramAccounts } from "@/src/adapters/telegram/account-service";
import * as views from "@/src/adapters/telegram/views";
import type { View } from "@/src/adapters/telegram/views";
import { llmContextStorage } from "@/src/lib/llm-context";

export const BOT_COMMANDS = [
  { command: "log", description: "Log today's work" },
  { command: "today", description: "See today's entry" },
  { command: "week", description: "This week at a glance" },
  { command: "skills", description: "Skills and tools so far" },
  { command: "defense", description: "Practise panel questions" },
  { command: "web", description: "Open your dashboard on the web" },
  { command: "email", description: "Add your email" },
  { command: "password", description: "Set a password for the web app" },
  { command: "settings", description: "Programme and account" },
  { command: "start", description: "Home" },
  { command: "help", description: "All commands" },
  { command: "cancel", description: "Stop what you're doing" },
  { command: "unlink", description: "Disconnect Telegram" }
];

export async function registerBotCommands(bot: Bot) {
  try {
    await bot.api.setMyCommands(BOT_COMMANDS);
    console.log("Successfully registered Telegram slash commands menu.");
  } catch (error) {
    console.error("Failed to register Telegram slash commands:", error);
  }
}

type TelegramRepository = PrismaTelegramRepository;

// Conversation state payloads. `cardId` is the message to collapse once the step is answered.
type State =
  | { state: "ONBOARDING_EMAIL"; payload: { cardId?: number } }
  | { state: "ONBOARDING_INSTITUTION"; payload: { cardId?: number } }
  | { state: "ONBOARDING_DEPARTMENT"; payload: { cardId?: number; institution: string } }
  | { state: "ONBOARDING_MATRIC"; payload: { cardId?: number; institution: string; department: string } }
  | { state: "ONBOARDING_ORGANIZATION"; payload: { cardId?: number; institution: string; department: string; matricNumber: string } }
  | { state: "ONBOARDING_DURATION"; payload: { cardId?: number; institution: string; department: string; matricNumber: string; organization: string; unit: string } }
  | { state: "AWAITING_EMAIL"; payload: { cardId?: number } }
  | { state: "AWAITING_ACTIVITY"; payload: { cardId?: number; programmeId?: string; workDate?: DateOnly } }
  | { state: "AWAITING_EDIT"; payload: { cardId?: number; entryId?: string; expectedVersion?: number } };

const ONBOARDING_QUESTIONS = {
  institution: { step: 2, question: "Which university or polytechnic do you attend?", example: "e.g. University of Lagos, FUTO" },
  department: { step: 3, question: "What's your course of study?", example: "e.g. Computer Engineering, Biochemistry" },
  matric: { step: 4, question: "What's your matric number?", example: "e.g. ENG1904234" },
  organization: {
    step: 5,
    question: "Where are you doing your SIWES? Add your unit after a dash if you know it.",
    example: "e.g. Chevron - IT Infrastructure"
  }
} as const;

const MESSAGE_OPTIONS = { parse_mode: "HTML" as const, link_preview_options: { is_disabled: true } };

function isUnchanged(error: unknown): boolean {
  return error instanceof GrammyError && error.description.includes("message is not modified");
}

function aiFailureNote(error: unknown): string {
  if (error instanceof AppError && error.code === "AI_UNSAFE_OUTPUT") {
    return "Your note is saved. The draft was thrown out because it added things you didn't write — try again, or write it yourself.";
  }
  if (error instanceof AppError && error.code === "AI_UNAVAILABLE") {
    return "Your note is saved. The drafting service is unavailable right now — try again in a bit, or write it yourself.";
  }
  return error instanceof AppError ? `Your note is saved. ${error.message}` : "Your note is saved, but the draft couldn't be made. Try again.";
}

export function createTelegramBot(input: {
  token: string;
  telegram: TelegramRepository;
  entries: EntryRepository;
  programmes: ProgrammeRepository;
  generator: DailyEntryGenerator;
  accounts: TelegramAccounts;
  appUrl: string;
}) {
  const bot = new Bot(input.token);

  // -------------------------------------------------------------------------
  // Card helpers. A callback edits the card its button lives on (the in-place transition);
  // a typed message or command gets a fresh card below it.
  // -------------------------------------------------------------------------

  async function send(ctx: Context, view: View): Promise<number> {
    const message = await ctx.reply(view.text, { ...MESSAGE_OPTIONS, reply_markup: view.keyboard });
    return message.message_id;
  }

  async function edit(ctx: Context, messageId: number, view: View): Promise<boolean> {
    const chatId = ctx.chat?.id;
    if (!chatId) return false;
    try {
      await ctx.api.editMessageText(chatId, messageId, view.text, { ...MESSAGE_OPTIONS, reply_markup: view.keyboard });
      return true;
    } catch (error) {
      return isUnchanged(error);
    }
  }

  /** Edit the card behind the tapped button, or send a new one when there is no card to edit. */
  async function render(ctx: Context, view: View): Promise<number> {
    const card = ctx.callbackQuery?.message;
    if (card && (await edit(ctx, card.message_id, view))) return card.message_id;
    return send(ctx, view);
  }

  /** Update an existing card; if it can't be edited (too old, deleted), send the view instead. */
  async function update(ctx: Context, messageId: number | undefined, view: View): Promise<number> {
    if (messageId && (await edit(ctx, messageId, view))) return messageId;
    return send(ctx, view);
  }

  /** Strip an answered prompt down to a one-line summary. Failures are harmless. */
  async function collapse(ctx: Context, messageId: number | undefined, view: View) {
    if (messageId) await edit(ctx, messageId, view);
  }

  async function ack(ctx: Context, text?: string, alert = false) {
    if (ctx.callbackQuery) await ctx.answerCallbackQuery(text ? { text, show_alert: alert } : undefined).catch(() => undefined);
  }

  async function setState(ctx: Context, userId: string, next: State) {
    await input.telegram.saveConversationState({
      userId,
      telegramChatId: String(ctx.chat?.id ?? ctx.from?.id ?? ""),
      state: next.state,
      payload: next.payload
    });
  }

  function telegramUserId(ctx: Context): string | null {
    return ctx.from?.id ? String(ctx.from.id) : null;
  }

  async function linkedUser(ctx: Context): Promise<string | null> {
    const id = telegramUserId(ctx);
    return id ? input.telegram.findUserIdByTelegramUser(id) : null;
  }

  /** Resolve the linked user and active programme, rendering the right fallback card if missing. */
  async function requireProgramme(ctx: Context): Promise<{ userId: string; programme: Programme } | null> {
    const userId = await linkedUser(ctx);
    if (!userId) {
      await render(ctx, views.welcomeView());
      return null;
    }
    const programme = await input.programmes.findActiveByUser(userId);
    if (!programme) {
      await render(ctx, views.noProgrammeView());
      return null;
    }
    return { userId, programme };
  }

  const todayFor = (programme: Programme) => dateFromTimestampInTimeZone(new Date(), programme.timezone);

  // -------------------------------------------------------------------------
  // Screens (shared by commands, typed shortcuts and buttons)
  // -------------------------------------------------------------------------

  async function showHome(ctx: Context) {
    const userId = await linkedUser(ctx);
    if (!userId) return render(ctx, views.welcomeView());
    const programme = await input.programmes.findActiveByUser(userId);
    if (!programme) return render(ctx, views.noProgrammeView());
    const [account, todayEntry] = await Promise.all([
      input.accounts.getEmail(userId),
      input.entries.findOwnedByDate(userId, programme.id, todayFor(programme))
    ]);
    return render(ctx, views.homeView({ programme, firstName: ctx.from?.first_name, hasEmail: Boolean(account.email), loggedToday: Boolean(todayEntry) }));
  }

  async function showToday(ctx: Context) {
    const resolved = await requireProgramme(ctx);
    if (!resolved) return;
    const today = todayFor(resolved.programme);
    const entry = await input.entries.findOwnedByDate(resolved.userId, resolved.programme.id, today);
    return render(ctx, entry ? views.entryView(entry) : views.todayEmptyView(today));
  }

  async function startLog(ctx: Context) {
    const resolved = await requireProgramme(ctx);
    if (!resolved) return;
    const today = todayFor(resolved.programme);
    const existing = await input.entries.findOwnedByDate(resolved.userId, resolved.programme.id, today);
    const cardId = await render(ctx, views.logPromptView(today, Boolean(existing)));
    await setState(ctx, resolved.userId, { state: "AWAITING_ACTIVITY", payload: { cardId, programmeId: resolved.programme.id, workDate: today } });
  }

  async function showWeek(ctx: Context) {
    const resolved = await requireProgramme(ctx);
    if (!resolved) return;
    const today = todayFor(resolved.programme);
    const entries = await input.entries.listForDateRange(resolved.userId, resolved.programme.id, resolved.programme.startDate, resolved.programme.endDate);
    return render(ctx, views.weekView(resolved.programme, entries, today));
  }

  async function showSkills(ctx: Context) {
    const resolved = await requireProgramme(ctx);
    if (!resolved) return;
    const entries = await input.entries.listForDateRange(resolved.userId, resolved.programme.id, resolved.programme.startDate, todayFor(resolved.programme));
    const skills = [...new Set(entries.flatMap((entry) => entry.structuredData?.skills ?? []))];
    const tools = [...new Set(entries.flatMap((entry) => entry.structuredData?.tools ?? []))];
    return render(ctx, views.skillsView(skills, tools, entries.length));
  }

  async function practiceQuestion(userId: string, programme: Programme, key?: string): Promise<{ key: string; question: string }> {
    if (key?.startsWith("g:")) {
      const index = Number(key.slice(2));
      const question = views.GENERIC_PRACTICE_QUESTIONS[index];
      if (question) return { key, question };
    }
    if (key?.startsWith("e:")) {
      const entry = await input.entries.findOwnedById(userId, key.slice(2));
      if (entry) return { key, question: views.practiceQuestionFromEntry(entry) };
    }
    const saved = (await input.entries.listForDateRange(userId, programme.id, programme.startDate, todayFor(programme))).filter((entry) => entry.status === "SAVED");
    const pool = [...saved.map((entry) => `e:${entry.id}`), ...views.GENERIC_PRACTICE_QUESTIONS.map((_question, index) => `g:${index}`)];
    const picked = pool[Math.floor(Math.random() * pool.length)];
    return practiceQuestion(userId, programme, picked);
  }

  async function showPractice(ctx: Context, key?: string, showHint = false) {
    const resolved = await requireProgramme(ctx);
    if (!resolved) return;
    const question = await practiceQuestion(resolved.userId, resolved.programme, key);
    return render(ctx, views.practiceView(question.question, question.key, showHint));
  }

  async function showSettings(ctx: Context) {
    const userId = await linkedUser(ctx);
    if (!userId) return render(ctx, views.welcomeView());
    const [programme, account] = await Promise.all([input.programmes.findActiveByUser(userId), input.accounts.getEmail(userId)]);
    return render(ctx, views.settingsView({ programme, email: account.email, emailVerified: account.verified, hasPassword: account.hasPassword }));
  }

  async function startEmail(ctx: Context) {
    const userId = await linkedUser(ctx);
    if (!userId) return render(ctx, views.welcomeView());
    const account = await input.accounts.getEmail(userId);
    if (account.email) return render(ctx, views.hasEmailView(account.email));
    const cardId = await render(ctx, views.emailPromptView());
    await setState(ctx, userId, { state: "AWAITING_EMAIL", payload: { cardId } });
  }

  async function openWeb(ctx: Context) {
    const userId = await linkedUser(ctx);
    if (!userId) return render(ctx, views.welcomeView());
    return render(ctx, views.webLinkView(await input.accounts.createWebLoginUrl(userId)));
  }

  async function openPasswordPage(ctx: Context) {
    const userId = await linkedUser(ctx);
    if (!userId) return render(ctx, views.welcomeView());
    const account = await input.accounts.getEmail(userId);
    // Password sign-in is by email, so collect the email first.
    if (!account.email) return startEmail(ctx);
    return render(ctx, views.webLinkView(await input.accounts.createWebLoginUrl(userId, "/settings/password"), "password"));
  }

  async function cancel(ctx: Context) {
    const userId = await linkedUser(ctx);
    if (userId) await input.telegram.clearConversationState(userId);
    return render(ctx, views.cancelledView());
  }

  async function showUnlinkConfirm(ctx: Context) {
    const userId = await linkedUser(ctx);
    if (!userId) return render(ctx, views.welcomeView());
    return render(ctx, views.unlinkConfirmView(await input.accounts.canSafelyUnlink(userId)));
  }

  /** Save the raw note, then morph a single "Drafting…" card into the draft (or the failure). */
  async function captureAndDraft(ctx: Context, userId: string, programmeId: string, workDate: DateOnly, note: string) {
    if (note.length < 3) {
      await send(ctx, views.shortNoteView());
      return;
    }
    await input.telegram.clearConversationState(userId);
    const cardId = await send(ctx, views.draftingView(workDate));

    let entry: Entry;
    try {
      entry = await captureDailyNote(input.entries, { userId, programmeId, workDate, rawText: note, source: "TELEGRAM" });
    } catch (error) {
      await update(ctx, cardId, views.errorView(error instanceof AppError ? error.message : "Your note couldn't be saved. Please try again."));
      return;
    }

    await ctx.replyWithChatAction("typing").catch(() => undefined);
    try {
      const drafted = await llmContextStorage.run({ userId, entryId: entry.id, purpose: "telegram-entry-generation" }, () =>
        generateEntry(input.entries, input.generator, userId, entry.id)
      );
      await update(ctx, cardId, views.entryView(drafted));
    } catch (error) {
      console.error("Telegram draft generation failed:", error);
      const latest = (await input.entries.findOwnedById(userId, entry.id)) ?? entry;
      await update(ctx, cardId, views.entryView(latest, { note: aiFailureNote(error) }));
    }
  }

  async function askInstitution(ctx: Context, userId: string) {
    const q = ONBOARDING_QUESTIONS.institution;
    const cardId = await send(ctx, views.onboardStepView(q.step, q.question, q.example));
    await setState(ctx, userId, { state: "ONBOARDING_INSTITUTION", payload: { cardId } });
  }

  // -------------------------------------------------------------------------
  // Commands
  // -------------------------------------------------------------------------

  bot.command("start", async (ctx) => {
    const token = ctx.match?.trim();
    const id = telegramUserId(ctx);
    if (!id) return;
    if (!token) return showHome(ctx);

    try {
      await consumeTelegramLinkToken(input.telegram, token, id, { username: ctx.from?.username, firstName: ctx.from?.first_name });
      const userId = await linkedUser(ctx);
      const account = userId ? await input.accounts.getEmail(userId) : { email: null };
      await send(ctx, account.email ? views.telegramConnectedView(account.email) : views.collapsedView("Connected ✓"));
      return showHome(ctx);
    } catch (error) {
      return send(ctx, views.errorView(error instanceof AppError ? error.message : "That link is no longer valid. Generate a new one from the web app."));
    }
  });

  bot.command("help", (ctx) => render(ctx, views.helpView()));
  bot.command("today", showToday);
  bot.command("log", startLog);
  bot.command("week", showWeek);
  bot.command("skills", showSkills);
  bot.command(["defense", "practice"], (ctx) => showPractice(ctx));
  bot.command("settings", showSettings);
  bot.command("unlink", showUnlinkConfirm);
  bot.command("cancel", cancel);
  bot.command("web", openWeb);
  bot.command("email", startEmail);
  bot.command("password", openPasswordPage);

  // -------------------------------------------------------------------------
  // Typed messages
  // -------------------------------------------------------------------------

  /** Handles a message while a flow is waiting for input. Returns false when no flow claims it. */
  async function handleStateText(ctx: Context, userId: string, current: State, text: string): Promise<boolean> {
    const { cardId } = current.payload;

    if (current.state === "ONBOARDING_EMAIL" || current.state === "AWAITING_EMAIL") {
      const onboarding = current.state === "ONBOARDING_EMAIL";
      const result = await input.accounts.requestEmail({ userId, email: text });
      if (result.status === "invalid" || result.status === "linked_elsewhere" || result.status === "both_have_programmes" || result.status === "unavailable") {
        await send(ctx, views.emailErrorView(result.status));
        return true;
      }
      if (result.status === "send_failed") {
        await collapse(ctx, cardId, views.answeredView("Email", "not added — couldn't send"));
        if (onboarding) await askInstitution(ctx, userId);
        else {
          await input.telegram.clearConversationState(userId);
          await send(ctx, views.emailErrorView("send_failed"));
        }
        return true;
      }
      if (result.status === "link_sent") {
        // The account already exists on the web; its programme is used once the link is confirmed.
        await collapse(ctx, cardId, views.answeredView("Email", result.email));
        await input.telegram.clearConversationState(userId);
        await send(ctx, views.emailSentView(result.email, "link"));
        return true;
      }
      if (onboarding) {
        await collapse(ctx, cardId, views.answeredView("Email", `${result.email} — confirm from your inbox`));
        await askInstitution(ctx, userId);
      } else {
        await collapse(ctx, cardId, views.answeredView("Email", result.email));
        await input.telegram.clearConversationState(userId);
        await send(ctx, views.emailSentView(result.email, "verify"));
      }
      return true;
    }

    if (current.state.startsWith("ONBOARDING_") && current.state !== "ONBOARDING_DURATION") {
      if (text.length < 2 || text.length > 160) {
        await send(ctx, { text: "<i>Please send between 2 and 160 characters.</i>" });
        return true;
      }
    }

    if (current.state === "ONBOARDING_INSTITUTION") {
      await collapse(ctx, cardId, views.answeredView("Institution", text));
      const q = ONBOARDING_QUESTIONS.department;
      const next = await send(ctx, views.onboardStepView(q.step, q.question, q.example));
      await setState(ctx, userId, { state: "ONBOARDING_DEPARTMENT", payload: { cardId: next, institution: text } });
      return true;
    }

    if (current.state === "ONBOARDING_DEPARTMENT") {
      await collapse(ctx, cardId, views.answeredView("Course", text));
      const q = ONBOARDING_QUESTIONS.matric;
      const next = await send(ctx, views.onboardStepView(q.step, q.question, q.example));
      await setState(ctx, userId, { state: "ONBOARDING_MATRIC", payload: { ...current.payload, cardId: next, department: text } });
      return true;
    }

    if (current.state === "ONBOARDING_MATRIC") {
      await collapse(ctx, cardId, views.answeredView("Matric number", text));
      const q = ONBOARDING_QUESTIONS.organization;
      const next = await send(ctx, views.onboardStepView(q.step, q.question, q.example));
      await setState(ctx, userId, { state: "ONBOARDING_ORGANIZATION", payload: { ...current.payload, cardId: next, matricNumber: text } });
      return true;
    }

    if (current.state === "ONBOARDING_ORGANIZATION") {
      const [organization, ...unitParts] = text.split(/\s+[-–—]\s+|,\s*/).map((part) => part.trim()).filter(Boolean);
      const unit = unitParts.join(" - ") || "Industrial Training Unit";
      await collapse(ctx, cardId, views.answeredView("Placement", `${organization ?? text} · ${unit}`));
      const next = await send(ctx, views.onboardDurationView());
      await setState(ctx, userId, { state: "ONBOARDING_DURATION", payload: { ...current.payload, cardId: next, organization: organization ?? text, unit } });
      return true;
    }

    if (current.state === "ONBOARDING_DURATION") {
      await send(ctx, { text: "<i>Pick 3 months or 6 months on the card above.</i>" });
      return true;
    }

    if (current.state === "AWAITING_ACTIVITY") {
      const { programmeId, workDate } = current.payload;
      if (!programmeId || !workDate) {
        await input.telegram.clearConversationState(userId);
        return false;
      }
      if (text.length >= 3) await collapse(ctx, cardId, views.collapsedView(views.shortDate(workDate), "Note received"));
      await captureAndDraft(ctx, userId, programmeId, workDate, text);
      return true;
    }

    if (current.state === "AWAITING_EDIT") {
      const { entryId, expectedVersion } = current.payload;
      if (!entryId || !expectedVersion) {
        await input.telegram.clearConversationState(userId);
        return false;
      }
      try {
        const saved = await saveEditedEntry(input.entries, { userId, entryId, editedText: text, expectedVersion });
        await input.telegram.clearConversationState(userId);
        await collapse(ctx, cardId, views.collapsedView(views.shortDate(saved.workDate), "Edited below"));
        await send(ctx, views.entryView(saved));
      } catch (error) {
        await input.telegram.clearConversationState(userId);
        const latest = await input.entries.findOwnedById(userId, entryId);
        await send(ctx, latest ? views.entryView(latest, { note: "This entry changed somewhere else, so your edit wasn't saved. Here's the latest — tap Edit to try again." }) : views.errorView(error instanceof AppError ? error.message : "Could not save that edit."));
      }
      return true;
    }

    return false;
  }

  bot.on("message:text", async (ctx) => {
    const text = ctx.message.text.trim();
    if (text.startsWith("/")) return render(ctx, views.helpView());

    // Accounts are created only by explicit onboarding or web linking, so a stray "hi"
    // doesn't create a placeholder user that later blocks linking a web account.
    const userId = await linkedUser(ctx);
    if (!userId) return send(ctx, views.welcomeView());

    const current = (await input.telegram.getConversationState(userId)) as State | null;
    if (current && (await handleStateText(ctx, userId, current, text))) return;

    const programme = await input.programmes.findActiveByUser(userId);
    if (!programme) return send(ctx, views.noProgrammeView());
    const today = todayFor(programme);
    const lower = text.toLowerCase();

    if (["log", "log today", "log entry", "log work", "record", "entry"].includes(lower)) return startLog(ctx);
    if (["today", "status"].includes(lower)) return showToday(ctx);
    if (["week", "this week"].includes(lower)) return showWeek(ctx);
    if (["hi", "hello", "hey", "start", "menu", "home"].includes(lower)) return showHome(ctx);
    if (lower === "help") return render(ctx, views.helpView());

    const prefixed = text.match(/^log(?:\s+today(?:'s)?(?:\s+entry)?)?\s*[:\-]\s*([\s\S]+)$/i);
    if (prefixed?.[1]) return captureAndDraft(ctx, userId, programme.id, today, prefixed[1].trim());

    // Free text becomes today's note only while today is still empty. Otherwise a casual
    // follow-up ("thanks") would replace the note behind a saved entry.
    const existing = await input.entries.findOwnedByDate(userId, programme.id, today);
    if (existing) return send(ctx, views.alreadyLoggedView(existing));
    return captureAndDraft(ctx, userId, programme.id, today, text);
  });

  // -------------------------------------------------------------------------
  // Buttons
  // -------------------------------------------------------------------------

  // `cmd:` is the legacy prefix still present on buttons in older messages and reminders.
  bot.callbackQuery(/^(?:nav|cmd):([a-z]+)$/, async (ctx) => {
    await ack(ctx);
    switch (ctx.match[1]) {
      case "home": return showHome(ctx);
      case "today": return showToday(ctx);
      case "log": return startLog(ctx);
      case "week": return showWeek(ctx);
      case "skills": return showSkills(ctx);
      case "practice":
      case "defense": return showPractice(ctx);
      case "settings": return showSettings(ctx);
      case "help": return render(ctx, views.helpView());
      case "cancel": return cancel(ctx);
      case "web": return openWeb(ctx);
      case "email": return startEmail(ctx);
      case "password": return openPasswordPage(ctx);
      case "dismiss": return render(ctx, views.dismissedView());
      default: return showHome(ctx);
    }
  });

  bot.callbackQuery(/^entry:(save|edit|regenerate|view):([^:]+)(?::(\d+))?$/, async (ctx) => {
    const userId = await linkedUser(ctx);
    if (!userId) return ack(ctx, "Connect your account first.", true);
    const [, action, entryId, version] = ctx.match;
    const entry = await input.entries.findOwnedById(userId, entryId);
    if (!entry) return ack(ctx, "That entry no longer exists.", true);

    if (action === "view") {
      await input.telegram.clearConversationState(userId);
      await ack(ctx);
      return render(ctx, views.entryView(entry));
    }

    if (action === "save") {
      try {
        const saved = await saveEditedEntry(input.entries, {
          userId,
          entryId,
          editedText: entry.generatedText ?? entry.editedText ?? entry.rawText,
          expectedVersion: Number(version)
        });
        await ack(ctx, "Saved");
        return render(ctx, views.entryView(saved));
      } catch (error) {
        await ack(ctx, error instanceof AppError && error.code === "CONFLICT" ? "This entry changed — showing the latest." : "Couldn't save this entry.", true);
        return render(ctx, views.entryView(entry));
      }
    }

    if (action === "edit") {
      await ack(ctx);
      const cardId = await render(ctx, views.editingView(entry));
      // Edit against the version shown on the card now, not the (possibly older) button.
      return setState(ctx, userId, { state: "AWAITING_EDIT", payload: { cardId, entryId, expectedVersion: entry.version } });
    }

    // regenerate: the same card goes Drafting… → new draft.
    await ack(ctx);
    const cardId = await render(ctx, views.draftingView(entry.workDate));
    await ctx.replyWithChatAction("typing").catch(() => undefined);
    try {
      const drafted = await llmContextStorage.run({ userId, entryId, purpose: "telegram-entry-regeneration" }, () =>
        generateEntry(input.entries, input.generator, userId, entryId)
      );
      return update(ctx, cardId, views.entryView(drafted));
    } catch (error) {
      console.error("Telegram draft regeneration failed:", error);
      const latest = (await input.entries.findOwnedById(userId, entryId)) ?? entry;
      return update(ctx, cardId, views.entryView(latest, { note: aiFailureNote(error) }));
    }
  });

  bot.callbackQuery("practice:next", async (ctx) => {
    await ack(ctx);
    return showPractice(ctx);
  });

  bot.callbackQuery(/^practice:hint:([ge]:[\w-]+)$/, async (ctx) => {
    await ack(ctx);
    return showPractice(ctx, ctx.match[1], true);
  });

  // Legacy practice buttons from older messages.
  bot.callbackQuery(["defense:next", "defense:hint"], async (ctx) => {
    await ack(ctx);
    return showPractice(ctx);
  });

  bot.callbackQuery("onboard:start", async (ctx) => {
    await ack(ctx);
    const id = telegramUserId(ctx);
    if (!id) return;
    const userId = await input.telegram.findOrCreateUserByTelegramUser(id, { username: ctx.from?.username, firstName: ctx.from?.first_name });
    if (await input.programmes.findActiveByUser(userId)) return showHome(ctx);

    const account = await input.accounts.getEmail(userId);
    if (account.email) {
      await render(ctx, views.answeredView("Email", account.email));
      return askInstitution(ctx, userId);
    }
    const cardId = await render(ctx, views.onboardEmailView());
    return setState(ctx, userId, { state: "ONBOARDING_EMAIL", payload: { cardId } });
  });

  bot.callbackQuery("onboard:skip-email", async (ctx) => {
    await ack(ctx);
    const userId = await linkedUser(ctx);
    if (!userId) return render(ctx, views.welcomeView());
    const current = (await input.telegram.getConversationState(userId)) as State | null;
    if (current?.state !== "ONBOARDING_EMAIL") return showHome(ctx);
    await render(ctx, views.answeredView("Email", "skipped — add it later with /email"));
    return askInstitution(ctx, userId);
  });

  bot.callbackQuery("onboard:link", async (ctx) => {
    await ack(ctx);
    return render(ctx, views.linkInstructionsView(input.appUrl));
  });

  bot.callbackQuery("onboard:about", async (ctx) => {
    await ack(ctx);
    return render(ctx, views.welcomeView());
  });

  bot.callbackQuery(/^onboard:duration:(3|6)$/, async (ctx) => {
    const userId = await linkedUser(ctx);
    if (!userId) return ack(ctx, "Session expired. Send /start to begin again.", true);
    const current = (await input.telegram.getConversationState(userId)) as State | null;
    if (current?.state !== "ONBOARDING_DURATION") return ack(ctx, "Session expired. Send /start to begin again.", true);
    await ack(ctx);

    // callback data is "onboard:duration:<n>"; the regex capture holds just the number.
    const durationMonths = ctx.match[1] === "6" ? 6 : 3;
    const { institution, department, matricNumber, organization, unit } = current.payload;
    await render(ctx, views.answeredView("Placement length", `${durationMonths} months`));

    try {
      const now = new Date();
      const startDate = parseDateOnly(`${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`);
      const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + durationMonths, 0));
      const endDate = parseDateOnly(end.toISOString().slice(0, 10));
      const programme = await createProgramme(input.programmes, {
        userId,
        durationMonths,
        institution,
        department,
        level: durationMonths === 6 ? "400 Level" : "300 Level",
        matricNumber,
        organization,
        unit,
        startDate,
        endDate,
        timezone: "Africa/Lagos",
        workingWeekdays: [1, 2, 3, 4, 5]
      });
      await input.telegram.clearConversationState(userId);
      return send(ctx, views.onboardDoneView(programme));
    } catch (error) {
      return send(ctx, views.errorView(error instanceof AppError ? error.message : "Setup failed. Send /start to try again."));
    }
  });

  bot.callbackQuery("settings:unlink_confirm", async (ctx) => {
    await ack(ctx);
    return showUnlinkConfirm(ctx);
  });

  bot.callbackQuery("settings:unlink_exec", async (ctx) => {
    const id = telegramUserId(ctx);
    const userId = await linkedUser(ctx);
    if (!id || !userId) return ack(ctx);
    // Re-check on the server: the button alone is not authorization.
    if (!(await input.accounts.canSafelyUnlink(userId))) {
      await ack(ctx);
      return render(ctx, views.unlinkConfirmView(false));
    }
    await input.telegram.unlinkTelegramUser(id);
    await ack(ctx, "Disconnected");
    return render(ctx, views.unlinkedView());
  });

  // Any other button (e.g. from a removed feature) — clear the spinner and go home.
  bot.on("callback_query:data", async (ctx) => {
    await ack(ctx);
    return showHome(ctx);
  });

  return bot;
}

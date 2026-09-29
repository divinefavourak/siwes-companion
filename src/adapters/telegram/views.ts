import { InlineKeyboard } from "grammy";
import type { Entry } from "@/src/core/entries/types";
import type { Programme } from "@/src/core/siwes/types";
import { addDays, isWorkingDate, weekday, type DateOnly } from "@/src/core/shared/date";
import { escapeTelegramHtml as esc } from "@/src/adapters/telegram/format";

/**
 * Every bot screen is a "card": one message whose text and buttons are replaced in place as
 * the flow moves on (Drafting… → Draft → Saved ✓). Views are pure so they can be unit-tested,
 * and all student-supplied text is escaped here, in one place.
 */
export type View = { text: string; keyboard?: InlineKeyboard };

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// Telegram caps messages at 4096 characters; leave room for the header, details and escaping.
const CARD_TEXT_LIMIT = 3000;
export const ONBOARDING_STEPS = 6;

export const GENERIC_PRACTICE_QUESTIONS = [
  "What safety precautions and PPE did your workplace require, and why?",
  "Which tools, software or machines did you use most, and how did you learn to use them?",
  "Describe a time a task didn't go as expected. What happened, and what did you do?",
  "How did what you learned in class connect with the work you did on placement?",
  "If you could improve one process at your placement, what would it be and why?"
];

export function shortDate(date: DateOnly): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  return `${DAY_NAMES[value.getUTCDay()]} ${value.getUTCDate()} ${MONTH_NAMES[value.getUTCMonth()]}`;
}

export function workingDaysLabel(weekdays: number[]): string {
  const days = [...new Set(weekdays)].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
  const key = days.join(",");
  if (key === "1,2,3,4,5") return "Mon–Fri";
  if (key === "1,2,3,4,5,6") return "Mon–Sat";
  return days.map((day) => DAY_NAMES[day]).join(", ");
}

export function entryText(entry: Entry): string {
  return entry.editedText ?? entry.generatedText ?? entry.rawText;
}

function header(title: string, status?: string): string {
  return status ? `<b>${esc(title)}</b> · ${esc(status)}` : `<b>${esc(title)}</b>`;
}

function muted(text: string): string {
  return `<i>${esc(text)}</i>`;
}

function clip(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
}

function compose(...blocks: Array<string | false | null | undefined>): string {
  return blocks.filter(Boolean).join("\n\n");
}

function field(label: string, value: string): string {
  return `<i>${esc(label)}</i>  ${esc(value)}`;
}

const homeButton = () => new InlineKeyboard().text("Home", "nav:home");

// ---------------------------------------------------------------------------
// Entry cards
// ---------------------------------------------------------------------------

export function entryStatusLabel(entry: Entry): string {
  if (entry.status === "SAVED") return "Saved ✓";
  if (entry.generationStatus === "PENDING") return "Drafting…";
  if (entry.generationStatus === "FAILED" || !entry.generatedText) return "Note only";
  if (entry.generationStatus === "NEEDS_CLARIFICATION") return "Draft · needs detail";
  return "Draft";
}

function entryDetails(entry: Entry): string | null {
  if (!entry.structuredData) return null;
  const lines = [
    entry.structuredData.tools.length ? field("Tools", entry.structuredData.tools.slice(0, 8).join(", ")) : null,
    entry.structuredData.skills.length ? field("Skills", entry.structuredData.skills.slice(0, 8).join(", ")) : null
  ].filter(Boolean);
  return lines.length ? lines.join("\n") : null;
}

function entryBody(entry: Entry): string {
  const text = entryText(entry);
  const body = esc(clip(text, CARD_TEXT_LIMIT));
  return text.length > CARD_TEXT_LIMIT ? `${body}\n${muted("Full text is on the web.")}` : body;
}

export function entryView(entry: Entry, options: { note?: string } = {}): View {
  const version = `${entry.id}:${entry.version}`;
  const saved = entry.status === "SAVED";
  const hasDraft = Boolean(entry.generatedText);
  const note =
    options.note ??
    (saved
      ? undefined
      : !hasDraft
        ? "Your note is saved. Try the draft again, or write the entry yourself."
        : entry.generationStatus === "NEEDS_CLARIFICATION"
          ? "Your note was thin, so the draft stays close to it. Add a detail with Edit, or save as is."
          : "Check the draft only says what you did, then save.");

  const keyboard = saved
    ? new InlineKeyboard().text("Edit", `entry:edit:${version}`).text("Redo draft", `entry:regenerate:${entry.id}`).row().text("This week", "nav:week").text("Home", "nav:home")
    : hasDraft
      ? new InlineKeyboard().text("Save", `entry:save:${version}`).text("Edit", `entry:edit:${version}`).text("Redo", `entry:regenerate:${entry.id}`)
      : new InlineKeyboard().text("Try again", `entry:regenerate:${entry.id}`).text("Write it myself", `entry:edit:${version}`).row().text("Home", "nav:home");

  return {
    text: compose(header(shortDate(entry.workDate), entryStatusLabel(entry)), entryBody(entry), hasDraft && entryDetails(entry), note && muted(note)),
    keyboard
  };
}

export function draftingView(date: DateOnly): View {
  return { text: compose(header(shortDate(date), "Drafting…"), muted("Turning your note into a logbook entry.")) };
}

export function editingView(entry: Entry): View {
  return {
    text: compose(header(shortDate(entry.workDate), "Editing"), entryBody(entry), muted("Send the corrected entry as your next message.")),
    keyboard: new InlineKeyboard().text("Cancel", `entry:view:${entry.id}`)
  };
}

export function logPromptView(date: DateOnly, replacing: boolean): View {
  return {
    text: compose(
      header(shortDate(date), "New entry"),
      "What did you work on? Send a rough note — bullet points are fine.",
      replacing && muted("This replaces today's note. Your saved entry stays until you save the new draft.")
    ),
    keyboard: new InlineKeyboard().text("Cancel", "nav:cancel")
  };
}

export function alreadyLoggedView(entry: Entry): View {
  return {
    text: compose(
      header(shortDate(entry.workDate), entryStatusLabel(entry)),
      entryBody(entry),
      muted("You've already logged today. To replace the note, tap Replace note.")
    ),
    keyboard: new InlineKeyboard()
      .text("Replace note", "nav:log")
      .text("Edit", `entry:edit:${entry.id}:${entry.version}`)
      .row()
      .text("Home", "nav:home")
  };
}

export function todayEmptyView(date: DateOnly): View {
  return {
    text: compose(header(shortDate(date), "Nothing logged yet"), "Send a rough note about what you did and it becomes today's entry."),
    keyboard: new InlineKeyboard().text("Log today", "nav:log").text("Home", "nav:home")
  };
}

/** A card that has served its purpose: header only, buttons removed. */
export function collapsedView(title: string, status?: string): View {
  return { text: header(title, status) };
}

export function answeredView(label: string, value: string): View {
  return { text: `✓ <b>${esc(label)}</b>  ${esc(value)}` };
}

// ---------------------------------------------------------------------------
// Overview cards
// ---------------------------------------------------------------------------

export function welcomeView(): View {
  return {
    text: compose(
      header("SIWES Companion"),
      "Turn rough notes about your day into clean logbook entries. Nothing is invented — only what you tell it goes in."
    ),
    keyboard: new InlineKeyboard().text("Set up here", "onboard:start").row().text("I already use the web app", "onboard:link")
  };
}

export function linkInstructionsView(appUrl: string): View {
  return {
    text: compose(
      header("Connect your web account"),
      [
        `1. Sign in at ${esc(appUrl)}`,
        "2. Open Settings → Telegram and tap Generate link",
        "3. Open that link — this chat connects automatically"
      ].join("\n"),
      muted("Or tap Set up here and enter the same email. We'll email you a link to connect.")
    ),
    keyboard: new InlineKeyboard().text("Set up here", "onboard:start").text("Back", "nav:home")
  };
}

export function homeView(input: { programme: Programme; firstName?: string; hasEmail: boolean; loggedToday: boolean }): View {
  const { programme } = input;
  const keyboard = new InlineKeyboard()
    .text("Log today", "nav:log")
    .text("Today", "nav:today")
    .row()
    .text("This week", "nav:week")
    .text("Skills", "nav:skills")
    .row()
    .text("Practice", "nav:practice")
    .text("Open web", "nav:web")
    .row();
  if (!input.hasEmail) keyboard.text("Add email", "nav:email");
  keyboard.text("Settings", "nav:settings");

  return {
    text: compose(
      header(input.firstName ? `Hi ${input.firstName}` : "SIWES Companion"),
      [`${esc(programme.organization)} · ${esc(programme.unit)}`, `${shortDate(programme.startDate)} – ${shortDate(programme.endDate)}`].join("\n"),
      input.loggedToday ? "Today is logged ✓" : "Today isn't logged yet.",
      !input.hasEmail && muted("Add an email so you can sign in on the web and recover your logbook.")
    ),
    keyboard
  };
}

export function noProgrammeView(): View {
  return {
    text: compose(header("No active programme"), "Set one up here, or on the web."),
    keyboard: new InlineKeyboard().text("Set up here", "onboard:start").text("Open web", "nav:web")
  };
}

export function weekView(programme: Programme, entries: Entry[], today: DateOnly): View {
  const monday = addDays(today, -((weekday(today) + 6) % 7));
  const days = Array.from({ length: 7 }, (_, index) => addDays(monday, index)).filter(
    (date) => date >= programme.startDate && date <= programme.endDate && isWorkingDate(programme, date)
  );
  const byDate = new Map(entries.map((entry) => [entry.workDate, entry]));
  const logged = days.filter((date) => byDate.has(date)).length;

  const lines = days.map((date) => {
    const entry = byDate.get(date);
    const label = `<b>${shortDate(date)}</b>`;
    if (entry) return `${entry.status === "SAVED" ? "✓" : "•"} ${label}  ${esc(clip(entryText(entry).replace(/\s+/g, " "), 60))}`;
    return `○ ${label}  ${muted(date > today ? "upcoming" : "missing")}`;
  });

  return {
    text: compose(
      header("This week", `${logged} of ${days.length} logged`),
      lines.length ? lines.join("\n") : "No working days in this week.",
      lines.length > 0 && muted("✓ saved · • draft · ○ not logged")
    ),
    keyboard: new InlineKeyboard().text("Log today", "nav:log").text("Home", "nav:home")
  };
}

export function skillsView(skills: string[], tools: string[], entryCount: number): View {
  const list = (items: string[]) => items.slice(0, 12).map((item) => `• ${esc(item)}`).join("\n");
  return {
    text: compose(
      header("Skills & tools", `from ${entryCount} ${entryCount === 1 ? "entry" : "entries"}`),
      !skills.length && !tools.length && "Nothing yet. Skills and tools are picked up from the notes you log.",
      skills.length > 0 && `<i>Skills</i>\n${list(skills)}`,
      tools.length > 0 && `<i>Tools</i>\n${list(tools)}`
    ),
    keyboard: new InlineKeyboard().text("Practice", "nav:practice").text("Home", "nav:home")
  };
}

export function practiceQuestionFromEntry(entry: Entry): string {
  return `On ${shortDate(entry.workDate)} you wrote: “${clip(entryText(entry).replace(/\s+/g, " "), 140)}”. Walk the panel through what you did, and why it was done that way.`;
}

export function practiceView(question: string, key: string, showHint: boolean): View {
  return {
    text: compose(
      header("Practice", "Panel question"),
      `<i>${esc(question)}</i>`,
      showHint
        ? [
            "<b>Situation</b> — the context or problem",
            "<b>Task</b> — what you were responsible for",
            "<b>Action</b> — the steps and tools you used",
            "<b>Result</b> — what happened and what you learned"
          ].join("\n")
        : muted("Answer out loud, then tap Next.")
    ),
    keyboard: showHint
      ? new InlineKeyboard().text("Next", "practice:next").text("Home", "nav:home")
      : new InlineKeyboard().text("Hint", `practice:hint:${key}`).text("Next", "practice:next").row().text("Home", "nav:home")
  };
}

export function settingsView(input: { programme: Programme | null; email: string | null; emailVerified: boolean; hasPassword: boolean }): View {
  const { programme } = input;
  const keyboard = new InlineKeyboard();
  // A password needs an email to sign in with, so offer email first.
  if (!input.email) keyboard.text("Add email", "nav:email");
  else keyboard.text(input.hasPassword ? "Change password" : "Set a web password", "nav:password");
  keyboard.text("Open web", "nav:web").row().text("Disconnect", "settings:unlink_confirm").text("Home", "nav:home");

  return {
    text: compose(
      header("Settings"),
      programme
        ? [
            field("Placement", `${programme.organization} · ${programme.unit}`),
            field("Institution", programme.institution),
            field("Dates", `${shortDate(programme.startDate)} – ${shortDate(programme.endDate)}`),
            field("Working days", workingDaysLabel(programme.workingWeekdays)),
            field("Timezone", programme.timezone)
          ].join("\n")
        : muted("No active programme."),
      field("Email", input.email ? `${input.email}${input.emailVerified ? " ✓" : " (unconfirmed)"}` : "not added"),
      field("Web password", input.hasPassword ? "set" : "not set"),
      muted("Working days and dates can be changed on the web.")
    ),
    keyboard
  };
}

export function unlinkConfirmView(canUnlink: boolean): View {
  if (!canUnlink) {
    return {
      text: compose(
        header("Disconnect Telegram"),
        "This account has no email or password yet, so disconnecting would lock you out of your logbook. Add an email first."
      ),
      keyboard: new InlineKeyboard().text("Add email", "nav:email").text("Back", "nav:settings")
    };
  }
  return {
    text: compose(header("Disconnect Telegram?"), "Your logbook stays safe on your account. You can reconnect later from the web app."),
    keyboard: new InlineKeyboard().text("Disconnect", "settings:unlink_exec").text("Keep connected", "nav:settings")
  };
}

export function unlinkedView(): View {
  return {
    text: compose(header("Disconnected"), "This chat is no longer connected to your SIWES Companion account."),
    keyboard: new InlineKeyboard().text("Connect a web account", "onboard:link")
  };
}

export function helpView(): View {
  return {
    text: compose(
      header("Commands"),
      [
        "/log — log today's work",
        "/today — see today's entry",
        "/week — this week at a glance",
        "/skills — skills and tools so far",
        "/defense — practise panel questions",
        "/web — open your dashboard on the web",
        "/email — add your email",
        "/password — set a password for the web app",
        "/settings — programme and account",
        "/cancel — stop what you're doing"
      ].join("\n"),
      muted("Or just send a note. If today is still empty, it becomes today's entry.")
    ),
    keyboard: homeButton()
  };
}

export function webLinkView(url: string, purpose: "dashboard" | "password" = "dashboard"): View {
  const canButton = url.startsWith("https://");
  const isPassword = purpose === "password";
  return {
    text: compose(
      header(isPassword ? "Set a web password" : "Open on the web", "Link ready"),
      isPassword
        ? "This one-time link signs you in and opens the password page. Once it's set, you can sign in on the web with your email and password."
        : "This one-time link signs you in to your dashboard.",
      !canButton && `<code>${esc(url)}</code>`,
      muted("It works once and expires in 10 minutes. Don't forward it.")
    ),
    // Telegram rejects non-HTTPS URL buttons (e.g. localhost), so fall back to text there.
    keyboard: canButton ? new InlineKeyboard().url(isPassword ? "Set password" : "Open dashboard", url).row().text("Home", "nav:home") : homeButton()
  };
}

export function cancelledView(): View {
  return { text: compose(header("Cancelled"), muted("Nothing was deleted.")), keyboard: homeButton() };
}

export function errorView(message: string): View {
  return { text: compose(header("Something went wrong"), esc(message)), keyboard: homeButton() };
}

export function shortNoteView(): View {
  return { text: muted("That note is a bit short — add a few words about what you did.") };
}

// ---------------------------------------------------------------------------
// Onboarding and email
// ---------------------------------------------------------------------------

export function onboardEmailView(): View {
  return {
    text: compose(
      header("Set up", `Step 1 of ${ONBOARDING_STEPS}`),
      "What's your email? It lets you sign in on the web and recover your logbook if you lose this Telegram account.",
      muted("Optional — you can skip this and add it later.")
    ),
    keyboard: new InlineKeyboard().text("Skip", "onboard:skip-email").text("Cancel", "nav:cancel")
  };
}

export function onboardStepView(step: number, question: string, example: string): View {
  return {
    text: compose(header("Set up", `Step ${step} of ${ONBOARDING_STEPS}`), esc(question), muted(example)),
    keyboard: new InlineKeyboard().text("Cancel", "nav:cancel")
  };
}

export function onboardDurationView(): View {
  return {
    text: compose(header("Set up", `Step ${ONBOARDING_STEPS} of ${ONBOARDING_STEPS}`), "How long is your placement?"),
    keyboard: new InlineKeyboard()
      .text("3 months", "onboard:duration:3")
      .text("6 months", "onboard:duration:6")
      .row()
      .text("Cancel", "nav:cancel")
  };
}

export function onboardDoneView(programme: Programme): View {
  return {
    text: compose(
      header("You're set up ✓"),
      [
        field("Placement", `${programme.organization} · ${programme.unit}`),
        field("Dates", `${shortDate(programme.startDate)} – ${shortDate(programme.endDate)}`),
        field("Working days", workingDaysLabel(programme.workingWeekdays))
      ].join("\n"),
      "Send your first note whenever you're ready — a rough line about what you did is enough.",
      muted("Dates and working days are estimates. Adjust them on the web if yours differ.")
    ),
    keyboard: new InlineKeyboard().text("Log today", "nav:log").text("Home", "nav:home")
  };
}

export function emailPromptView(): View {
  return {
    text: compose(
      header("Add your email"),
      "Send your email address as your next message. We'll email you a link to confirm it.",
      muted("Your email lets you sign in on the web and recover your logbook if you lose this Telegram account.")
    ),
    keyboard: new InlineKeyboard().text("Cancel", "nav:cancel")
  };
}

/** Sent to existing Telegram-only students by the admin "Ask for emails" action. */
export function emailRequestView(firstName?: string | null): View {
  return {
    text: compose(
      header("One quick thing"),
      `${firstName ? `Hi ${esc(firstName)} — add` : "Add"} your email so you can sign in on the web and recover your logbook if you ever lose access to this Telegram account.`
    ),
    keyboard: new InlineKeyboard().text("Add email", "nav:email").text("Later", "nav:dismiss")
  };
}

export function emailSentView(email: string, kind: "verify" | "link"): View {
  return kind === "link"
    ? {
        text: compose(
          header("Check your inbox"),
          `<b>${esc(email)}</b> already has a SIWES Companion account. We sent it a link — open it to connect this Telegram to that account.`,
          muted("The link expires in 24 hours.")
        ),
        keyboard: homeButton()
      }
    : {
        text: compose(
          header("Check your inbox"),
          `We sent a confirmation link to <b>${esc(email)}</b>. Open it to finish adding your email.`,
          muted("The link expires in 24 hours.")
        ),
        keyboard: homeButton()
      };
}

export function emailErrorView(status: "invalid" | "linked_elsewhere" | "both_have_programmes" | "unavailable" | "send_failed"): View {
  const message = {
    invalid: "That doesn't look like an email address. Send it again, or tap Cancel.",
    linked_elsewhere: "That email's account is already connected to a different Telegram account. Try another email, or tap Cancel.",
    both_have_programmes:
      "That email already has a web account with its own SIWES programme, and so does this chat, so they can't be combined automatically. Use a different email, or contact support to merge them.",
    unavailable: "That email can't be used. Try another one, or tap Cancel.",
    send_failed: "We couldn't send the email just now. Try again later with /email."
  }[status];
  return {
    text: compose(header("Email not added"), esc(message)),
    keyboard: status === "send_failed" ? homeButton() : new InlineKeyboard().text("Cancel", "nav:cancel")
  };
}

export function hasEmailView(email: string): View {
  return { text: compose(header("Email"), `${esc(email)} is on your account ✓`), keyboard: homeButton() };
}

export function dismissedView(): View {
  return { text: compose(header("No problem"), muted("You can add your email anytime with /email.")) };
}

export function emailConfirmedView(email: string): View {
  return {
    text: compose(
      header("Email confirmed ✓"),
      `${esc(email)} is now on your account.`,
      muted("Set a web password to sign in on the web with your email, or keep using Open web from here.")
    ),
    keyboard: new InlineKeyboard().text("Set a web password", "nav:password").text("Home", "nav:home")
  };
}

export function telegramConnectedView(email: string): View {
  return {
    text: compose(header("Connected ✓"), `This chat is now connected to the account for ${esc(email)}.`),
    keyboard: homeButton()
  };
}

// ---------------------------------------------------------------------------
// Push messages
// ---------------------------------------------------------------------------

export function reminderView(input: { name?: string | null; organization?: string | null; workDate: DateOnly }): View {
  return {
    text: compose(
      header(shortDate(input.workDate), "Not logged yet"),
      `${input.name ? `Hi ${esc(input.name)} — take` : "Take"} a minute to note what you worked on${input.organization ? ` at ${esc(input.organization)}` : ""} today.`
    ),
    keyboard: new InlineKeyboard().text("Log today", "nav:log").text("Open web", "nav:web")
  };
}

export function testNotificationView(name?: string | null): View {
  return {
    text: compose(
      header("Notifications are on ✓"),
      `${name ? `Hi ${esc(name)} — you'll` : "You'll"} get a nudge here on working days you haven't logged yet.`
    ),
    keyboard: new InlineKeyboard().text("Log today", "nav:log").text("Home", "nav:home")
  };
}

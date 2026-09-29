import { describe, expect, it } from "vitest";
import type { Entry } from "@/src/core/entries/types";
import type { Programme } from "@/src/core/siwes/types";
import * as views from "@/src/adapters/telegram/views";

function entry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: "ckentry0000000000000000000",
    programmeId: "prog-1",
    workDate: "2026-09-29",
    rawText: "terminated cables",
    rawSource: "TELEGRAM",
    generatedText: "I terminated four CAT6 cables.",
    editedText: null,
    structuredData: { skills: ["cable termination"], tools: ["crimper"], learnings: [], challenges: [], projects: [], achievements: [], claims: [] },
    status: "READY_FOR_REVIEW",
    generationStatus: "COMPLETED",
    generationError: null,
    version: 3,
    ...overrides
  };
}

const programme: Programme = {
  id: "prog-1",
  userId: "user-1",
  durationMonths: 3,
  institution: "Unilag",
  department: "Computer Engineering",
  level: "300 Level",
  matricNumber: "ENG1",
  organization: "Acme <Labs>",
  unit: "IT",
  startDate: "2026-09-01",
  endDate: "2026-11-30",
  timezone: "Africa/Lagos",
  workingWeekdays: [1, 2, 3, 4, 5, 6],
  overrides: [{ date: "2026-10-01", status: "NON_WORKING" }],
  status: "ACTIVE"
};

function buttons(view: views.View) {
  return (view.keyboard?.inline_keyboard ?? []).flat();
}

function callbacks(view: views.View): string[] {
  return buttons(view).flatMap((button) => ("callback_data" in button ? [button.callback_data] : []));
}

describe("Telegram views", () => {
  it("formats dates compactly and deterministically", () => {
    expect(views.shortDate("2026-09-29")).toBe("Tue 29 Sep");
    expect(views.workingDaysLabel([5, 4, 3, 2, 1])).toBe("Mon–Fri");
    expect(views.workingDaysLabel([1, 2, 3, 4, 5, 6])).toBe("Mon–Sat");
    expect(views.workingDaysLabel([0, 2])).toBe("Tue, Sun");
  });

  it("escapes student text so HTML in a note can't break the message", () => {
    const view = views.entryView(entry({ generatedText: "Fixed <script> & tested" }));
    expect(view.text).toContain("Fixed &lt;script&gt; &amp; tested");
    expect(views.homeView({ programme, hasEmail: true, loggedToday: false }).text).toContain("Acme &lt;Labs&gt;");
  });

  it("offers Save/Edit/Redo on a draft and moves to Edit/Redo once saved", () => {
    expect(callbacks(views.entryView(entry()))).toEqual([
      "entry:save:ckentry0000000000000000000:3",
      "entry:edit:ckentry0000000000000000000:3",
      "entry:regenerate:ckentry0000000000000000000"
    ]);
    const saved = views.entryView(entry({ status: "SAVED", editedText: "I terminated four CAT6 cables." }));
    expect(saved.text).toContain("Saved ✓");
    expect(callbacks(saved)).not.toContain("entry:save:ckentry0000000000000000000:3");
  });

  it("lets the student retry or write it themselves when drafting failed", () => {
    const failed = views.entryView(entry({ generatedText: null, structuredData: null, generationStatus: "FAILED" }));
    expect(failed.text).toContain("Note only");
    expect(failed.text).toContain("terminated cables");
    expect(buttons(failed).map((button) => button.text)).toEqual(["Try again", "Write it myself", "Home"]);
  });

  it("clips very long entries to fit Telegram's message limit", () => {
    const view = views.entryView(entry({ generatedText: "a".repeat(6000) }));
    expect(view.text.length).toBeLessThan(4096);
    expect(view.text).toContain("Full text is on the web.");
  });

  it("builds the week from the programme's working days and overrides", () => {
    // Week of Mon 28 Sep: Mon–Sat are working days, Thu 1 Oct is a holiday override.
    const view = views.weekView(programme, [entry({ workDate: "2026-09-28", status: "SAVED" }), entry({ workDate: "2026-09-29" })], "2026-09-30");
    expect(view.text).toContain("2 of 5 logged");
    expect(view.text).toContain("✓ <b>Mon 28 Sep</b>");
    expect(view.text).toContain("• <b>Tue 29 Sep</b>");
    expect(view.text).toContain("○ <b>Wed 30 Sep</b>  <i>missing</i>");
    expect(view.text).not.toContain("Thu 1 Oct");
    expect(view.text).toContain("○ <b>Sat 3 Oct</b>  <i>upcoming</i>");
  });

  it("shows the Add email button only when the account has no email", () => {
    expect(callbacks(views.homeView({ programme, hasEmail: false, loggedToday: true }))).toContain("nav:email");
    expect(callbacks(views.homeView({ programme, hasEmail: true, loggedToday: true }))).not.toContain("nav:email");
  });

  it("uses a URL button for HTTPS sign-in links and falls back to text otherwise", () => {
    const https = views.webLinkView("https://example.com/auth/telegram?token=abc");
    expect(buttons(https).some((button) => "url" in button)).toBe(true);
    const local = views.webLinkView("http://localhost:3000/auth/telegram?token=abc");
    expect(buttons(local).some((button) => "url" in button)).toBe(false);
    expect(local.text).toContain("<code>http://localhost:3000/auth/telegram?token=abc</code>");
  });

  it("asks for an email before offering a password, then offers set or change", () => {
    const noEmail = callbacks(views.settingsView({ programme, email: null, emailVerified: false, hasPassword: false }));
    expect(noEmail).toContain("nav:email");
    expect(noEmail).not.toContain("nav:password");
    const noPassword = views.settingsView({ programme, email: "a@b.co", emailVerified: true, hasPassword: false });
    expect(buttons(noPassword).map((button) => button.text)).toContain("Set a web password");
    const withPassword = views.settingsView({ programme, email: "a@b.co", emailVerified: true, hasPassword: true });
    expect(buttons(withPassword).map((button) => button.text)).toContain("Change password");
    expect(views.webLinkView("https://example.com/auth/telegram?token=x&next=%2Fsettings%2Fpassword", "password").text).toContain("password page");
  });

  it("blocks unlinking when it would lock the student out", () => {
    expect(callbacks(views.unlinkConfirmView(false))).not.toContain("settings:unlink_exec");
    expect(callbacks(views.unlinkConfirmView(true))).toContain("settings:unlink_exec");
  });

  it("keeps every callback within Telegram's 64-byte limit", () => {
    const all = [
      views.entryView(entry()),
      views.editingView(entry()),
      views.alreadyLoggedView(entry()),
      views.practiceView("Q?", "e:ckentry0000000000000000000", false),
      views.homeView({ programme, hasEmail: false, loggedToday: false }),
      views.onboardDurationView(),
      views.settingsView({ programme, email: null, emailVerified: false, hasPassword: false })
    ].flatMap(callbacks);
    for (const data of all) expect(Buffer.byteLength(data)).toBeLessThanOrEqual(64);
  });
});

describe("Telegram sign-in link destinations", () => {
  it("only lands on allow-listed pages", async () => {
    const { safeTelegramLinkDestination } = await import("@/src/lib/telegram-link-destinations");
    expect(safeTelegramLinkDestination("/settings/password")).toBe("/settings/password");
    expect(safeTelegramLinkDestination("https://evil.example")).toBe("/dashboard");
    expect(safeTelegramLinkDestination("//evil.example")).toBe("/dashboard");
    expect(safeTelegramLinkDestination(undefined)).toBe("/dashboard");
  });
});

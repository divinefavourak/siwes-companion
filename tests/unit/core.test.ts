import { describe, expect, it } from "vitest";
import { AppError, isAppError } from "@/src/core/shared/errors";
import {
  addDays,
  dateFromTimestampInTimeZone,
  dateRange,
  daysBetween,
  isDateInProgramme,
  isWorkingDate,
  parseDateOnly,
  programmeProgress,
  toDateOnly,
  weekday,
  workingDates,
  type ProgrammeCalendar
} from "@/src/core/shared/date";
import { randomIdGenerator } from "@/src/core/shared/id";
import { createProgramme, createProgrammeSchema, updateProgrammeSettings } from "@/src/core/siwes/siwes-service";
import type { CreateProgrammeInput, Programme, ProgrammeRepository } from "@/src/core/siwes/types";
import { captureDailyNote, generateEntry, saveEditedEntry } from "@/src/core/entries/entry-service";
import { generatedEntrySchema } from "@/src/core/entries/entry-schema";
import type { DailyEntryGenerator, Entry, EntryRepository, GeneratedEntry } from "@/src/core/entries/types";
import { dailyEntryPrompt, groundedSystemPrompt } from "@/src/core/ai/prompts";
import { emptyStructuredData, findGroundingViolations, withClarification } from "@/src/core/ai/grounding";
import { createDailyEntryGenerator } from "@/src/core/ai/daily-entry-generator";
import { fakeDailyEntryProvider } from "@/src/core/ai/fake-provider";
import { consumeTelegramLinkToken, createTelegramLinkToken, hashLinkToken, type TelegramLinkRepository } from "@/src/core/telegram/link-service";
import { buildSummaryDraft, reviewedEntryFromRecord } from "@/src/core/summaries/summary-service";
import { buildReportDraft } from "@/src/core/reports/report-service";
import { buildPresentationDraft } from "@/src/core/reports/presentation-service";
import { buildDefenseFeedback, nextGroundedQuestion } from "@/src/core/defense/defense-service";
import { createEvidence, type EvidenceInput, type EvidenceRepository } from "@/src/core/evidence/evidence-service";

const calendar: ProgrammeCalendar = {
  startDate: "2026-09-01",
  endDate: "2026-09-10",
  timezone: "Africa/Lagos",
  workingWeekdays: [1, 2, 3, 4, 5],
  overrides: [{ date: "2026-09-05", status: "WORKING" }, { date: "2026-09-07", status: "NON_WORKING" }]
};

function entry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: "entry-1",
    programmeId: "programme-1",
    workDate: "2026-09-03",
    rawText: "I reviewed the API notes.",
    rawSource: "WEB",
    generatedText: null,
    editedText: null,
    structuredData: null,
    status: "DRAFT",
    generationStatus: "NOT_REQUESTED",
    generationError: null,
    version: 1,
    ...overrides
  };
}

const generated: GeneratedEntry = {
  formalEntry: "Reviewed the API notes.",
  structuredData: {
    skills: ["reading API documentation"],
    tools: [],
    learnings: ["the API request flow"],
    challenges: [],
    projects: [],
    achievements: [],
    claims: [{ text: "Reviewed the API notes", source: "raw" }]
  },
  clarificationQuestions: []
};

class FakeEntryRepository implements EntryRepository {
  current: Entry | null = entry();
  calls = { pending: 0, generated: 0, failed: 0 };
  async findOwnedByDate() { return this.current; }
  async findOwnedById() { return this.current; }
  async upsertRawNote(input: Parameters<EntryRepository["upsertRawNote"]>[0]) {
    this.current = { ...entry(), ...input, id: "entry-1", workDate: input.workDate, status: "DRAFT", version: 1 };
    return this.current;
  }
  async markGenerationPending() { this.calls.pending += 1; this.current = { ...this.current!, generationStatus: "PENDING" }; return this.current; }
  async saveGeneration(_userId: string, _entryId: string, value: GeneratedEntry) { this.calls.generated += 1; this.current = { ...this.current!, ...value, generatedText: value.formalEntry, structuredData: value.structuredData, generationStatus: "COMPLETED", status: "READY_FOR_REVIEW", version: this.current!.version + 1 }; return this.current; }
  async saveGenerationFailure(_userId: string, _entryId: string, message: string) { this.calls.failed += 1; this.current = { ...this.current!, generationStatus: "FAILED", generationError: message }; return this.current; }
  async saveEditedText(_userId: string, _entryId: string, text: string, expectedVersion: number) { if (expectedVersion !== this.current!.version) throw new AppError("CONFLICT", "changed"); this.current = { ...this.current!, editedText: text, status: "SAVED", version: expectedVersion + 1 }; return this.current; }
  async listForDateRange() { return this.current ? [this.current] : []; }
}

class FakeProgrammeRepository implements ProgrammeRepository {
  existing: Programme | null = null;
  input: Parameters<ProgrammeRepository["create"]>[0] | null = null;
  async create(input: Parameters<ProgrammeRepository["create"]>[0]) { this.input = input; return { ...input, id: "programme-1", overrides: [], status: "ACTIVE" as const, durationMonths: input.durationMonths } as Programme; }
  async findActiveByUser() { return this.existing; }
  async findOwnedById() { return this.existing; }
  async updateSettings(_userId: string, _programmeId: string, settings: { workingWeekdays?: number[]; timezone?: string }) {
    if (!this.existing) throw new AppError("NOT_FOUND", "Programme not found");
    this.existing = {
      ...this.existing,
      ...(settings.workingWeekdays ? { workingWeekdays: settings.workingWeekdays } : {}),
      ...(settings.timezone ? { timezone: settings.timezone } : {})
    };
    return this.existing;
  }
}

describe("date rules", () => {
  it("parses and formats date-only values safely", () => {
    expect(parseDateOnly("2026-09-01")).toBe("2026-09-01");
    expect(toDateOnly(new Date("2026-09-01T23:00:00.000Z"))).toBe("2026-09-01");
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
    expect(dateRange("2026-09-01", "2026-09-03")).toEqual(["2026-09-01", "2026-09-02", "2026-09-03"]);
    expect(weekday("2026-09-06")).toBe(0);
    expect(daysBetween("2026-09-01", "2026-09-03")).toBe(2);
  });

  it("rejects malformed and impossible calendar dates", () => {
    expect(() => parseDateOnly("2026/09/01")).toThrow("Invalid date-only value");
    expect(() => parseDateOnly("2026-02-30")).toThrow("Invalid calendar date");
    expect(dateRange("2026-09-03", "2026-09-01")).toEqual([]);
  });

  it("uses weekday defaults and explicit overrides", () => {
    expect(isWorkingDate(calendar, "2026-09-01")).toBe(true);
    expect(isWorkingDate(calendar, "2026-09-06")).toBe(false);
    expect(isWorkingDate(calendar, "2026-09-05")).toBe(true);
    expect(isWorkingDate(calendar, "2026-09-07")).toBe(false);
    expect(workingDates(calendar)).toContain("2026-09-05");
    expect(workingDates(calendar)).not.toContain("2026-09-07");
  });

  it("calculates progress before, during and after a programme", () => {
    expect(programmeProgress(calendar, "2026-08-30", [])).toMatchObject({ currentDay: 0, totalDays: 8, completedDays: 0, percent: 0 });
    expect(programmeProgress(calendar, "2026-09-05", ["2026-09-01", "2026-09-02", "2026-09-05"])).toMatchObject({ currentDay: 5, completedDays: 3, remainingDays: 5, percent: 38 });
    expect(programmeProgress(calendar, "2026-09-20", ["2026-09-01"])).toMatchObject({ currentDay: 8, remainingDays: 7 });
    const empty: ProgrammeCalendar = { ...calendar, startDate: "2026-09-06", endDate: "2026-09-05" };
    expect(programmeProgress(empty, "2026-09-05", [])).toMatchObject({ totalDays: 0, percent: 0 });
  });

  it("uses the programme timezone and date bounds", () => {
    expect(dateFromTimestampInTimeZone(new Date("2026-09-20T23:30:00.000Z"), "Africa/Lagos")).toBe("2026-09-21");
    expect(isDateInProgramme(calendar, "2026-09-01")).toBe(true);
    expect(isDateInProgramme(calendar, "2026-09-11")).toBe(false);
  });
});

describe("shared errors and IDs", () => {
  it("identifies app errors and creates IDs", () => {
    const error = new AppError("CONFLICT", "Changed", { field: "version" });
    expect(error.name).toBe("AppError");
    expect(isAppError(error)).toBe(true);
    expect(isAppError(new Error("no"))).toBe(false);
    expect(randomIdGenerator.next()).toMatch(/[0-9a-f-]{36}/);
  });
});

describe("programme service", () => {
  const input: CreateProgrammeInput = { userId: "user-1", durationMonths: 3, institution: "Demo University", department: "Computer Science", level: "300", matricNumber: "CS/1", organization: "Demo Ltd", unit: "Engineering", startDate: "2026-09-01", endDate: "2026-11-30" };

  it("validates, rejects reversed dates and creates a programme", async () => {
    expect(createProgrammeSchema.safeParse({ ...input, startDate: "bad" }).success).toBe(false);
    expect(createProgrammeSchema.safeParse({ ...input, endDate: "bad" }).success).toBe(false);
    const repository = new FakeProgrammeRepository();
    await expect(createProgramme(repository, { ...input, startDate: "bad" } as unknown as CreateProgrammeInput)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(createProgramme(repository, { ...input, startDate: "2026-12-01", endDate: "2026-11-30" })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    const programme = await createProgramme(repository, input);
    expect(programme.id).toBe("programme-1");
    expect(repository.input?.timezone).toBe("Africa/Lagos");
    expect(repository.input?.workingWeekdays).toEqual([1, 2, 3, 4, 5]);
  });

  it("blocks a second active programme", async () => {
    const repository = new FakeProgrammeRepository(); repository.existing = { id: "old", ...input, timezone: "Africa/Lagos", workingWeekdays: [1], overrides: [], status: "ACTIVE" };
    await expect(createProgramme(repository, input)).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("validates and updates programme calendar settings", async () => {
    const repository = new FakeProgrammeRepository();
    await expect(updateProgrammeSettings(repository, { userId: "user-1", programmeId: "programme-1" })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(updateProgrammeSettings(repository, { userId: "user-1", programmeId: "programme-1", workingWeekdays: [9] })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(updateProgrammeSettings(repository, { userId: "user-1", programmeId: "programme-1", workingWeekdays: [1, 2, 3] })).rejects.toMatchObject({ code: "NOT_FOUND" });

    repository.existing = { id: "programme-1", ...input, timezone: "Africa/Lagos", workingWeekdays: [1, 2, 3, 4, 5], overrides: [], status: "ACTIVE" };
    const updated = await updateProgrammeSettings(repository, {
      userId: "user-1",
      programmeId: "programme-1",
      workingWeekdays: [1, 2, 3, 4, 5, 6],
      timezone: "UTC"
    });
    expect(updated.workingWeekdays).toEqual([1, 2, 3, 4, 5, 6]);
    expect(updated.timezone).toBe("UTC");
  });
});

describe("entry service", () => {
  it("captures only valid notes", async () => {
    const repository = new FakeEntryRepository();
    await expect(captureDailyNote(repository, { userId: "u", programmeId: "p", workDate: "2026-09-01", rawText: "x", source: "WEB" })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    const saved = await captureDailyNote(repository, { userId: "u", programmeId: "p", workDate: "2026-09-01", rawText: "I reviewed API notes", source: "WEB" });
    expect(saved.rawText).toContain("API");
  });

  it("generates, validates and handles provider failures", async () => {
    const repository = new FakeEntryRepository();
    const success: DailyEntryGenerator = { generate: async () => generated };
    const result = await generateEntry(repository, success, "u", "entry-1");
    expect(result.generationStatus).toBe("COMPLETED");
    expect(repository.calls).toMatchObject({ pending: 1, generated: 1 });

    repository.current = null;
    await expect(generateEntry(repository, success, "u", "missing")).rejects.toMatchObject({ code: "NOT_FOUND" });

    repository.current = entry();
    const appFailure: DailyEntryGenerator = { generate: async () => { throw new AppError("AI_UNSAFE_OUTPUT", "unsafe"); } };
    await expect(generateEntry(repository, appFailure, "u", "entry-1")).rejects.toMatchObject({ code: "AI_UNSAFE_OUTPUT" });
    const plainFailure: DailyEntryGenerator = { generate: async () => { throw new Error("offline"); } };
    await expect(generateEntry(repository, plainFailure, "u", "entry-1")).rejects.toMatchObject({ code: "AI_UNAVAILABLE" });
    const unknownFailure: DailyEntryGenerator = { generate: async () => { throw "offline"; } };
    await expect(generateEntry(repository, unknownFailure, "u", "entry-1")).rejects.toMatchObject({ code: "AI_UNAVAILABLE" });
    expect(repository.calls.failed).toBe(3);
  });

  it("turns malformed generation output into a safe failure", async () => {
    const repository = new FakeEntryRepository();
    const malformed: DailyEntryGenerator = { generate: async () => ({}) as GeneratedEntry };
    await expect(generateEntry(repository, malformed, "u", "entry-1")).rejects.toMatchObject({ code: "AI_UNAVAILABLE" });
    expect(repository.calls.failed).toBe(1);
  });

  it("saves edits and rejects invalid edits", async () => {
    const repository = new FakeEntryRepository();
    await expect(saveEditedEntry(repository, { userId: "u", entryId: "entry-1", editedText: " ", expectedVersion: 1 })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(saveEditedEntry(repository, { userId: "u", entryId: "entry-1", editedText: "Reviewed the notes.", expectedVersion: 1 })).resolves.toMatchObject({ status: "SAVED", version: 2 });
  });
});

describe("AI grounding", () => {
  it("builds prompts and detects unsupported claims", () => {
    expect(groundedSystemPrompt).toContain("Never invent");
    expect(dailyEntryPrompt({ rawText: "I reviewed router notes", workDate: "2026-09-01" })).toContain("<student_note>");
    const unsafe = { ...generated, formalEntry: "Configured and optimized enterprise infrastructure.", structuredData: { ...generated.structuredData, tools: ["Kubernetes"], projects: ["billing platform"], achievements: ["reduced outages"] } };
    expect(findGroundingViolations("I watched my supervisor configure the router.", unsafe)).toHaveLength(4);
    expect(findGroundingViolations("I used PostgreSQL.", { ...generated, structuredData: { ...generated.structuredData, tools: ["PostgreSQL"] } })).toEqual([]);
  });

  it("adds at most two unique clarification questions", () => {
    expect(withClarification(generated, "What did you personally do?").clarificationQuestions).toContain("What did you personally do?");
    const many = { ...generated, clarificationQuestions: ["one", "two"] };
    expect(withClarification(many, "three").clarificationQuestions).toEqual(["one", "two"]);
    expect(withClarification(many, "one").clarificationQuestions).toEqual(["one", "two"]);
    expect(emptyStructuredData()).toEqual({ skills: [], tools: [], learnings: [], challenges: [], projects: [], achievements: [], claims: [] });
    expect(generatedEntrySchema.parse(generated)).toEqual(generated);
  });
});

describe("daily AI generator", () => {
  it("returns valid provider output and wraps failure modes", async () => {
    const provider = { generateJson: async () => generated };
    await expect(createDailyEntryGenerator(provider).generate({ rawText: "I reviewed API notes.", workDate: "2026-09-01" })).resolves.toEqual(generated);
    const invalid = { generateJson: async () => ({}) };
    await expect(createDailyEntryGenerator(invalid).generate({ rawText: "I reviewed API notes.", workDate: "2026-09-01" })).rejects.toMatchObject({ code: "AI_UNSAFE_OUTPUT" });
    const unsafe = { generateJson: async () => ({ ...generated, formalEntry: "Configured enterprise infrastructure." }) };
    await expect(createDailyEntryGenerator(unsafe).generate({ rawText: "I watched my supervisor configure the router.", workDate: "2026-09-01" })).rejects.toMatchObject({ code: "AI_UNSAFE_OUTPUT" });
    const unavailable = { generateJson: async () => { throw new Error("down"); } };
    await expect(createDailyEntryGenerator(unavailable).generate({ rawText: "I reviewed API notes.", workDate: "2026-09-01" })).rejects.toMatchObject({ code: "AI_UNAVAILABLE" });
    const unknownFailure = { generateJson: async () => { throw "down"; } };
    await expect(createDailyEntryGenerator(unknownFailure).generate({ rawText: "I reviewed API notes.", workDate: "2026-09-01" })).rejects.toMatchObject({ code: "AI_UNAVAILABLE" });
  });

  it("keeps the fake provider grounded and asks for thin-note detail", async () => {
    const short = await fakeDailyEntryProvider.generateJson({ purpose: "daily_entry", system: "", user: "<student_note>watched</student_note>", maxOutputTokens: 1, timeoutMs: 1 });
    expect(short).toMatchObject({ clarificationQuestions: ["What did you personally do or learn?"] });
    const long = await fakeDailyEntryProvider.generateJson({ purpose: "daily_entry", system: "", user: "<student_note>I reviewed the API documentation and wrote notes for the team.</student_note>", maxOutputTokens: 1, timeoutMs: 1 });
    expect(long).toMatchObject({ clarificationQuestions: [] });
    const missing = await fakeDailyEntryProvider.generateJson({ purpose: "daily_entry", system: "", user: "no note", maxOutputTokens: 1, timeoutMs: 1 });
    expect(missing).toMatchObject({ formalEntry: "" });
  });
});

describe("Telegram link tokens", () => {
  class FakeLinkRepository implements TelegramLinkRepository {
    created: { userId: string; tokenHash: string; expiresAt: Date } | null = null;
    mode: "success" | "app-error" | "unknown" = "success";
    async createToken(input: { userId: string; tokenHash: string; expiresAt: Date }) { this.created = input; }
    async consumeToken(input: { tokenHash: string; telegramUserId: string }) {
      if (this.mode === "app-error") throw new AppError("CONFLICT", "used");
      if (this.mode === "unknown") throw "database down";
      expect(input.tokenHash).toBe(hashLinkToken("token-token-token-token"));
      return "user-1";
    }
  }

  it("creates hashed expiring tokens and consumes them once", async () => {
    const repository = new FakeLinkRepository();
    const now = new Date("2026-09-21T10:00:00.000Z");
    const created = await createTelegramLinkToken(repository, "user-1", now, () => "token-token-token-token");
    expect(created.rawToken).toBe("token-token-token-token");
    expect(repository.created?.tokenHash).toBe(hashLinkToken(created.rawToken));
    expect(created.expiresAt.toISOString()).toBe("2026-09-21T10:10:00.000Z");
    const defaultToken = await createTelegramLinkToken(repository, "user-1", now);
    expect(defaultToken.rawToken.length).toBeGreaterThan(20);
    await expect(consumeTelegramLinkToken(repository, created.rawToken, "telegram-1", { username: "student" }, now)).resolves.toBe("user-1");
  });

  it("rejects invalid identities and maps repository failures safely", async () => {
    const repository = new FakeLinkRepository();
    await expect(consumeTelegramLinkToken(repository, "short", "telegram-1", {})).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(consumeTelegramLinkToken(repository, "token-token-token-token", "", {})).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    repository.mode = "app-error";
    await expect(consumeTelegramLinkToken(repository, "token-token-token-token", "telegram-1", {})).rejects.toMatchObject({ code: "CONFLICT", message: "used" });
    repository.mode = "unknown";
    await expect(consumeTelegramLinkToken(repository, "token-token-token-token", "telegram-1", {}, new Date("2026-09-21T10:00:00.000Z"))).rejects.toMatchObject({ code: "CONFLICT" });
  });
});

describe("compile and defense services", () => {
  const reviewed = reviewedEntryFromRecord({ id: "e-1", workDate: "2026-09-01", rawText: "watched", generatedText: "Observed the router setup.", editedText: null, structuredData: { skills: ["observation"], tools: ["router"], projects: [], challenges: [] } });
  const second = { ...reviewed, id: "e-2", date: "2026-09-02" as const, text: "Tested connectivity.", skills: ["testing"], tools: ["router"], projects: ["network check"], challenges: ["unstable connection"] };

  it("builds compact weekly or monthly summaries from reviewed records", () => {
    expect(buildSummaryDraft([], "Week 1")).toMatchObject({ summary: "No reviewed work was recorded for Week 1.", sourceEntryIds: [] });
    const summary = buildSummaryDraft([second, reviewed, { ...reviewed, id: "e-3", date: "2026-09-03", text: "Tested connectivity." }], "Week 1");
    expect(summary.summary).toContain("3 days");
    expect(summary.sourceEntryIds).toEqual(["e-1", "e-2", "e-3"]);
    expect(summary.tools).toEqual(["router"]);
    expect(buildSummaryDraft([reviewed], "Day").summary).toContain("1 day.");
    expect(buildSummaryDraft([{ ...reviewed, text: " ", skills: [""], tools: [""], projects: [""], challenges: [""] }], "Empty").workCompleted).toEqual([]);
    expect(reviewedEntryFromRecord({ id: reviewed.id, workDate: reviewed.date, rawText: "raw", generatedText: null, editedText: "edited", structuredData: null }).text).toBe("edited");
    expect(reviewedEntryFromRecord({ id: reviewed.id, workDate: reviewed.date, rawText: "raw", generatedText: null, editedText: null, structuredData: null }).text).toBe("raw");
  });

  it("builds report and presentation sections with explicit gaps", () => {
    const context = { institution: "Demo University", department: "Computer Science", organization: "Demo Ltd", unit: "Engineering", startDate: "2026-09-01" as const, endDate: "2026-11-30" as const, entries: [reviewed, second] };
    const report = buildReportDraft(context);
    expect(report.sections).toHaveLength(11);
    expect(report.sections.find((section) => section.sectionKey === "activities-carried-out")?.generatedText).toContain("router");
    expect(report.sections.find((section) => section.sectionKey === "recommendations")?.unsupportedGaps).toHaveLength(1);
    const emptyReport = buildReportDraft({ ...context, entries: [] });
    expect(emptyReport.sections.find((section) => section.sectionKey === "activities-carried-out")?.unsupportedGaps).toHaveLength(1);
    const presentation = buildPresentationDraft(context);
    expect(presentation.slides).toHaveLength(5);
    expect(presentation.slides[3].bullets).toEqual(["network check"]);
    expect(buildPresentationDraft({ ...context, entries: [] }).slides[1].unsupportedGaps).toHaveLength(1);
  });

  it("generates grounded defense questions and qualitative feedback", () => {
    expect(nextGroundedQuestion([reviewed, second], [reviewed.id])).toMatchObject({ sourceEntryIds: ["e-2"] });
    expect(nextGroundedQuestion([reviewed], [reviewed.id]).sourceEntryIds).toEqual([]);
    const feedback = buildDefenseFeedback({ turns: [{ question: "Q1", answer: "A1", topic: "tools", struggled: false }, { question: "Q2", answer: null, topic: "projects", struggled: true }, { question: "Q3", answer: "A3", topic: "tools", struggled: true }] });
    expect(feedback.questionsAnswered).toEqual(["Q1", "Q3"]);
    expect(feedback.topicsCovered).toEqual(["tools", "projects"]);
    expect(feedback.areasToReview).toEqual(["projects", "tools"]);
    expect(feedback.questionsStruggledWith).toEqual(["Q2", "Q3"]);
  });
});

describe("evidence service", () => {
  const repository: EvidenceRepository = {
    async create(input: EvidenceInput) { return { ...input, id: "evidence-1", status: "AVAILABLE" as const }; },
    async list() { return []; }
  };

  it("validates the evidence kind-specific fields", async () => {
    await expect(createEvidence(repository, { userId: "u", programmeId: "p", kind: "URL", title: "Docs" })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(createEvidence(repository, { userId: "u", programmeId: "p", kind: "URL", title: "Docs", url: "not-url" })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(createEvidence(repository, { userId: "u", programmeId: "p", kind: "NOTE", title: "Note" })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(createEvidence(repository, { userId: "u", programmeId: "p", kind: "FILE", title: "Screenshot" })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(createEvidence(repository, { userId: "u", programmeId: "p", kind: "URL", title: "Docs", url: "https://example.com" })).resolves.toMatchObject({ status: "AVAILABLE" });
    await expect(createEvidence(repository, { userId: "u", programmeId: "p", kind: "NOTE", title: "Note", note: "A useful reminder" })).resolves.toMatchObject({ status: "AVAILABLE" });
    await expect(createEvidence(repository, { userId: "u", programmeId: "p", kind: "FILE", title: "Screenshot", fileName: "shot.png", mimeType: "image/png", byteSize: 100 })).resolves.toMatchObject({ id: "evidence-1" });
  });
});

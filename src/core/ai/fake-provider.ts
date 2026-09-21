import type { JsonLlmProvider } from "@/src/core/ai/daily-entry-generator";

export const fakeDailyEntryProvider: JsonLlmProvider = {
  async generateJson({ user }: { purpose: "daily_entry"; system: string; user: string; maxOutputTokens: number; timeoutMs: number }) {
    const match = user.match(/<student_note>([\s\S]*)<\/student_note>/);
    const rawText = match?.[1]?.trim() ?? "";
    return {
      formalEntry: rawText,
      structuredData: {
        skills: [],
        tools: [],
        learnings: [],
        challenges: [],
        projects: [],
        achievements: [],
        claims: rawText ? [{ text: rawText, source: "raw" as const }] : []
      },
      clarificationQuestions: rawText.length < 40 ? ["What did you personally do or learn?"] : []
    };
  }
};

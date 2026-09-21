import { generatedEntrySchema } from "@/src/core/entries/entry-schema";
import type { DailyEntryGenerator, GeneratedEntry } from "@/src/core/entries/types";
import { AppError } from "@/src/core/shared/errors";
import type { DateOnly } from "@/src/core/shared/date";
import { dailyEntryPrompt, groundedSystemPrompt } from "@/src/core/ai/prompts";
import { findGroundingViolations } from "@/src/core/ai/grounding";

export interface JsonLlmProvider {
  generateJson(input: {
    purpose: "daily_entry";
    system: string;
    user: string;
    maxOutputTokens: number;
    timeoutMs: number;
  }): Promise<unknown>;
}

export function createDailyEntryGenerator(provider: JsonLlmProvider): DailyEntryGenerator {
  return {
    async generate(input: { rawText: string; workDate: DateOnly }): Promise<GeneratedEntry> {
      let response: unknown;
      try {
        response = await provider.generateJson({
          purpose: "daily_entry",
          system: groundedSystemPrompt,
          user: dailyEntryPrompt(input),
          maxOutputTokens: 900,
          timeoutMs: 20_000
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Provider failed";
        throw new AppError("AI_UNAVAILABLE", "The AI provider is unavailable", { cause: message });
      }

      const parsed = generatedEntrySchema.safeParse(response);
      if (!parsed.success) {
        throw new AppError("AI_UNSAFE_OUTPUT", "The AI returned an invalid draft", {
          issues: parsed.error.issues
        });
      }

      const output = parsed.data as GeneratedEntry;
      const violations = findGroundingViolations(input.rawText, output);
      if (violations.length > 0) {
        throw new AppError("AI_UNSAFE_OUTPUT", "The draft included unsupported claims", { violations });
      }

      return output;
    }
  };
}

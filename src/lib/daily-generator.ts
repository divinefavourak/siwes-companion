import { env } from "@/src/lib/env";
import { fakeDailyEntryProvider } from "@/src/core/ai/fake-provider";
import { createDailyEntryGenerator } from "@/src/core/ai/daily-entry-generator";
import { AnthropicJsonProvider } from "@/src/adapters/ai/anthropic-provider";
import { GroqJsonProvider } from "@/src/adapters/ai/groq-provider";
import type { JsonLlmProvider } from "@/src/core/ai/daily-entry-generator";

export function resolveJsonLlmProvider(): JsonLlmProvider {
  if (env.groqApiKey) {
    return new GroqJsonProvider();
  }
  if (env.anthropicApiKey) {
    return new AnthropicJsonProvider();
  }
  return fakeDailyEntryProvider;
}

export function getDailyGenerator() {
  return createDailyEntryGenerator(resolveJsonLlmProvider());
}


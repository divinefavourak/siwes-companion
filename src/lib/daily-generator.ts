import { env } from "@/src/lib/env";
import { fakeDailyEntryProvider } from "@/src/core/ai/fake-provider";
import { createDailyEntryGenerator } from "@/src/core/ai/daily-entry-generator";
import { AnthropicJsonProvider } from "@/src/adapters/ai/anthropic-provider";

export function getDailyGenerator() {
  return createDailyEntryGenerator(env.anthropicApiKey ? new AnthropicJsonProvider() : fakeDailyEntryProvider);
}

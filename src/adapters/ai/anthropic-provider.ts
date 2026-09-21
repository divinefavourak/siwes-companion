import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/src/lib/env";
import { aiConfig } from "@/src/adapters/ai/config";
import type { JsonLlmProvider } from "@/src/core/ai/daily-entry-generator";

export class AnthropicJsonProvider implements JsonLlmProvider {
  private readonly client = new Anthropic({ apiKey: env.anthropicApiKey });

  async generateJson(input: Parameters<JsonLlmProvider["generateJson"]>[0]): Promise<unknown> {
    const response = await this.client.messages.create({
      model: aiConfig.fastModel,
      max_tokens: input.maxOutputTokens,
      system: input.system,
      messages: [{ role: "user", content: input.user }]
    });
    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();
    return JSON.parse(text) as unknown;
  }
}

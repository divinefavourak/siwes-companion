import https from "node:https";
import { env } from "@/src/lib/env";
import { aiConfig } from "@/src/adapters/ai/config";
import { llmContextStorage } from "@/src/lib/llm-context";
import { prisma } from "@/src/lib/prisma";
import type { JsonLlmProvider } from "@/src/core/ai/daily-entry-generator";

async function logLlmUsage(
  provider: string,
  model: string,
  usage?: { prompt_tokens?: number; completion_tokens?: number }
) {
  if (!process.env.DATABASE_URL) return;
  const context = llmContextStorage.getStore();
  const promptTokens = usage?.prompt_tokens ?? 0;
  const outputTokens = usage?.completion_tokens ?? 0;
  // Llama-3.3-70b: $0.59 per 1M prompt tokens, $0.79 per 1M completion tokens
  const cost = (promptTokens * 0.00000059) + (outputTokens * 0.00000079);

  try {
    await prisma.llmUsage.create({
      data: {
        userId: context?.userId ?? null,
        programmeId: context?.programmeId ?? null,
        entryId: context?.entryId ?? null,
        provider,
        model,
        purpose: context?.purpose ?? "daily-entry-generation",
        promptTokens,
        outputTokens,
        estimatedCost: cost,
      },
    });
  } catch (err) {
    if (process.env.NODE_ENV !== "test") {
      console.error("Failed to log LLM usage:", err);
    }
  }
}

export interface GroqJsonProviderOptions {
  apiKey?: string;
  model?: string;
  apiUrl?: string;
  fetchFn?: typeof fetch;
}

interface HttpsResponse {
  statusCode: number;
  body: string;
}

function httpsPost(
  urlStr: string,
  headers: Record<string, string>,
  bodyStr: string,
  timeoutMs: number,
  rejectUnauthorized = true
): Promise<HttpsResponse> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const req = https.request(
      url,
      {
        method: "POST",
        headers,
        rejectUnauthorized
      },
      (res) => {
        let responseBody = "";
        res.setEncoding("utf-8");
        res.on("data", (chunk) => {
          responseBody += chunk;
        });
        res.on("end", () => {
          resolve({
            statusCode: res.statusCode ?? 0,
            body: responseBody
          });
        });
      }
    );

    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`Groq API request timed out after ${timeoutMs}ms`));
    });

    req.on("error", (err) => {
      reject(err);
    });

    req.write(bodyStr);
    req.end();
  });
}

export class GroqJsonProvider implements JsonLlmProvider {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly apiUrl: string;
  private readonly customFetchFn?: typeof fetch;

  constructor(options: GroqJsonProviderOptions = {}) {
    this.apiKey = options.apiKey ?? env.groqApiKey ?? "";
    this.model = options.model ?? aiConfig.groqFastModel;
    this.apiUrl = options.apiUrl ?? aiConfig.groqApiUrl;
    this.customFetchFn = options.fetchFn;

    if (!this.apiKey) {
      throw new Error("Groq API key is required");
    }
  }

  async generateJson(input: Parameters<JsonLlmProvider["generateJson"]>[0]): Promise<unknown> {
    const payload = JSON.stringify({
      model: this.model,
      messages: [
        { role: "system", content: input.system },
        { role: "user", content: input.user }
      ],
      response_format: { type: "json_object" },
      max_tokens: input.maxOutputTokens
    });

    // If a custom mock fetch is injected (e.g. in unit tests), use it directly
    if (this.customFetchFn) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), input.timeoutMs);
      try {
        const res = await this.customFetchFn(this.apiUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json"
          },
          body: payload,
          signal: controller.signal
        });

        if (!res.ok) {
          const errorBody = await res.text().catch(() => "");
          throw new Error(`Groq API error (${res.status}): ${errorBody}`);
        }

        const json = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
          usage?: { prompt_tokens?: number; completion_tokens?: number };
        };
        const content = json.choices?.[0]?.message?.content?.trim();
        if (!content) {
          throw new Error("Groq API returned an empty completion");
        }
        await logLlmUsage("groq", this.model, json.usage);
        return JSON.parse(content) as unknown;
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          throw new Error(`Groq API request timed out after ${input.timeoutMs}ms`);
        }
        throw err;
      } finally {
        clearTimeout(timeout);
      }
    }

    // Otherwise use node:https with graceful fallback for Windows local root CA environments
    const headers = {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload).toString()
    };

    let response: HttpsResponse;
    try {
      response = await httpsPost(this.apiUrl, headers, payload, input.timeoutMs, true);
    } catch (err: unknown) {
      // If failed due to local Windows certificate verification in development, fallback with lenient SSL
      const errorObj = err as { code?: string; message?: string } | null;
      if (
        errorObj?.code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE" ||
        errorObj?.code === "CERT_HAS_EXPIRED" ||
        errorObj?.message?.includes("unable to verify")
      ) {
        response = await httpsPost(this.apiUrl, headers, payload, input.timeoutMs, false);
      } else {
        throw err;
      }
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw new Error(`Groq API error (${response.statusCode}): ${response.body}`);
    }

    const json = JSON.parse(response.body) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };

    const content = json.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new Error("Groq API returned an empty completion");
    }

    await logLlmUsage("groq", this.model, json.usage);
    return JSON.parse(content) as unknown;
  }
}

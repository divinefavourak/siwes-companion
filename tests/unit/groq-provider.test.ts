import { describe, expect, it } from "vitest";
import { GroqJsonProvider } from "@/src/adapters/ai/groq-provider";
import { createDailyEntryGenerator } from "@/src/core/ai/daily-entry-generator";
import type { GeneratedEntry } from "@/src/core/entries/types";

const sampleGenerated: GeneratedEntry = {
  formalEntry: "Reviewed the database schemas.",
  structuredData: {
    skills: ["schema analysis"],
    tools: ["PostgreSQL"],
    learnings: ["relational structures"],
    challenges: [],
    projects: [],
    achievements: [],
    claims: [{ text: "Reviewed database schemas", source: "raw" }]
  },
  clarificationQuestions: []
};

describe("GroqJsonProvider", () => {
  it("requires an API key", () => {
    expect(() => new GroqJsonProvider({ apiKey: "" })).toThrow("Groq API key is required");
  });

  it("sends formatted request with json_object format and parses valid response", async () => {
    let capturedUrl = "";
    let capturedInit: RequestInit | undefined;

    const mockFetch: typeof fetch = async (url, init) => {
      capturedUrl = String(url);
      capturedInit = init;
      return {
        ok: true,
        status: 200,
        text: async () => "",
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify(sampleGenerated)
              }
            }
          ]
        })
      } as unknown as Response;
    };

    const provider = new GroqJsonProvider({
      apiKey: "gsk_test_key_123",
      model: "llama-3.3-70b-versatile",
      fetchFn: mockFetch
    });

    const result = await provider.generateJson({
      purpose: "daily_entry",
      system: "System instructions here",
      user: "User note here",
      maxOutputTokens: 900,
      timeoutMs: 5000
    });

    expect(result).toEqual(sampleGenerated);
    expect(capturedUrl).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect(capturedInit?.method).toBe("POST");

    const headers = capturedInit?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer gsk_test_key_123");
    expect(headers["Content-Type"]).toBe("application/json");

    const parsedBody = JSON.parse(capturedInit?.body as string);
    expect(parsedBody.model).toBe("llama-3.3-70b-versatile");
    expect(parsedBody.response_format).toEqual({ type: "json_object" });
    expect(parsedBody.max_tokens).toBe(900);
    expect(parsedBody.messages).toEqual([
      { role: "system", content: "System instructions here" },
      { role: "user", content: "User note here" }
    ]);
  });

  it("handles HTTP error responses cleanly", async () => {
    const mockFetch: typeof fetch = async () => ({
      ok: false,
      status: 401,
      text: async () => JSON.stringify({ error: { message: "Invalid API key" } })
    } as unknown as Response);

    const provider = new GroqJsonProvider({
      apiKey: "bad_key",
      fetchFn: mockFetch
    });

    await expect(
      provider.generateJson({
        purpose: "daily_entry",
        system: "sys",
        user: "usr",
        maxOutputTokens: 100,
        timeoutMs: 1000
      })
    ).rejects.toThrow("Groq API error (401)");
  });

  it("handles empty completion content from Groq", async () => {
    const mockFetch: typeof fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: "" } }]
      })
    } as unknown as Response);

    const provider = new GroqJsonProvider({
      apiKey: "test_key",
      fetchFn: mockFetch
    });

    await expect(
      provider.generateJson({
        purpose: "daily_entry",
        system: "sys",
        user: "usr",
        maxOutputTokens: 100,
        timeoutMs: 1000
      })
    ).rejects.toThrow("Groq API returned an empty completion");
  });

  /*
  it("integrates with createDailyEntryGenerator and enforces grounding", async () => {
    const mockFetch: typeof fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                ...sampleGenerated,
                formalEntry: "Configured enterprise database cluster.",
                structuredData: {
                  ...sampleGenerated.structuredData,
                  tools: ["Kubernetes"]
                }
              })
            }
          }
        ]
      })
    } as unknown as Response);

    const provider = new GroqJsonProvider({
      apiKey: "test_key",
      fetchFn: mockFetch
    });

    const generator = createDailyEntryGenerator(provider);

    // Input note only mentions watching, but output has 'Configured' and unmentioned 'Kubernetes'
    await expect(
      generator.generate({
        rawText: "I watched the team inspect PostgreSQL database schemas.",
        workDate: "2026-09-01"
      })
    ).rejects.toMatchObject({
      code: "AI_UNSAFE_OUTPUT",
      details: expect.objectContaining({
        violations: expect.arrayContaining([
          "observation was upgraded to a performed responsibility",
          "unsupported tool: Kubernetes"
        ])
      })
    });
  });
  */

  it("handles timeouts properly", async () => {
    const mockFetch: typeof fetch = async (_url, init) => {
      return new Promise((_, reject) => {
        const signal = init?.signal;
        if (signal) {
          signal.addEventListener("abort", () => {
            const abortErr = new Error("The operation was aborted");
            abortErr.name = "AbortError";
            reject(abortErr);
          });
        }
      });
    };

    const provider = new GroqJsonProvider({
      apiKey: "test_key",
      fetchFn: mockFetch
    });

    await expect(
      provider.generateJson({
        purpose: "daily_entry",
        system: "sys",
        user: "usr",
        maxOutputTokens: 100,
        timeoutMs: 50
      })
    ).rejects.toThrow(/timed out after 50ms/);
  });
});

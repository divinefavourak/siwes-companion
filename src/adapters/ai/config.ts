export const aiConfig = {
  fastModel: process.env.ANTHROPIC_FAST_MODEL ?? "verify-at-build-time",
  strongModel: process.env.ANTHROPIC_STRONG_MODEL ?? "verify-at-build-time",
  inputUsdPerMillion: Number(process.env.ANTHROPIC_INPUT_USD_PER_MILLION ?? 0),
  outputUsdPerMillion: Number(process.env.ANTHROPIC_OUTPUT_USD_PER_MILLION ?? 0),
  groqFastModel: process.env.GROQ_FAST_MODEL ?? process.env.GROQ_MODEL ?? "qwen/qwen3.8-27b",
  groqStrongModel: process.env.GROQ_STRONG_MODEL ?? process.env.GROQ_MODEL ?? "openai/gpt-oss-120b",
  groqApiUrl: process.env.GROQ_API_URL ?? "https://api.groq.com/openai/v1/chat/completions"
};

export const aiConfig = {
  fastModel: process.env.ANTHROPIC_FAST_MODEL ?? "verify-at-build-time",
  strongModel: process.env.ANTHROPIC_STRONG_MODEL ?? "verify-at-build-time",
  inputUsdPerMillion: Number(process.env.ANTHROPIC_INPUT_USD_PER_MILLION ?? 0),
  outputUsdPerMillion: Number(process.env.ANTHROPIC_OUTPUT_USD_PER_MILLION ?? 0)
};

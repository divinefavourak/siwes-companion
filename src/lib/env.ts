import { z } from "zod";

const optionalString = z.string().trim().optional();

export const env = {
  databaseUrl: process.env.DATABASE_URL,
  authSecret: process.env.AUTH_SECRET ?? "local-development-secret-change-me",
  groqApiKey: optionalString.parse(process.env.GROQ_API_KEY),
  anthropicApiKey: optionalString.parse(process.env.ANTHROPIC_API_KEY),
  telegramBotToken: optionalString.parse(process.env.TELEGRAM_BOT_TOKEN),
  googleClientId: optionalString.parse(process.env.AUTH_GOOGLE_ID),
  googleClientSecret: optionalString.parse(process.env.AUTH_GOOGLE_SECRET),
  resendApiKey: optionalString.parse(process.env.RESEND_API_KEY),
  resendFromEmail: process.env.RESEND_FROM_EMAIL || "SIWES Companion <siwescompanion@akanbi.dev>",
  appUrl: process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://swcompanion.akanbi.dev"
};

export function hasGoogleAuth(): boolean {
  return Boolean(env.googleClientId && env.googleClientSecret);
}

export function hasResend(): boolean {
  return Boolean(env.resendApiKey);
}

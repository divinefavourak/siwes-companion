import { createHash, randomBytes } from "node:crypto";
import { AppError } from "@/src/core/shared/errors";

export type LinkToken = { rawToken: string; expiresAt: Date };

export interface TelegramLinkRepository {
  createToken(input: { userId: string; tokenHash: string; expiresAt: Date }): Promise<void>;
  consumeToken(input: { tokenHash: string; telegramUserId: string; username?: string; firstName?: string }): Promise<string>;
}

export function hashLinkToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createTelegramLinkToken(
  repository: TelegramLinkRepository,
  userId: string,
  now = new Date(),
  tokenFactory: () => string = () => randomBytes(32).toString("base64url")
): Promise<LinkToken> {
  const rawToken = tokenFactory();
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);
  await repository.createToken({ userId, tokenHash: hashLinkToken(rawToken), expiresAt });
  return { rawToken, expiresAt };
}

export async function consumeTelegramLinkToken(
  repository: TelegramLinkRepository,
  rawToken: string,
  telegramUserId: string,
  profile: { username?: string; firstName?: string },
  now = new Date()
): Promise<string> {
  if (!rawToken || rawToken.length < 20) throw new AppError("VALIDATION_ERROR", "Invalid link token");
  if (!telegramUserId) throw new AppError("VALIDATION_ERROR", "Telegram identity is required");
  try {
    return await repository.consumeToken({ tokenHash: hashLinkToken(rawToken), telegramUserId, ...profile });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("CONFLICT", "This link could not be used", { at: now.toISOString() });
  }
}

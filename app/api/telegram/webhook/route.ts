import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import type { UserFromGetMe } from "grammy/types";
import { createTelegramBot } from "@/src/adapters/telegram/bot";
import { PrismaTelegramRepository } from "@/src/adapters/telegram/prisma-telegram-repository";
import { prismaTelegramAccounts } from "@/src/adapters/telegram/account-service";
import { PrismaEntryRepository, PrismaProgrammeRepository } from "@/src/adapters/web/prisma-repositories";
import { getDailyGenerator } from "@/src/lib/daily-generator";
import { env } from "@/src/lib/env";

let cachedBotInfo: UserFromGetMe | null = null;

// Telegram echoes the secret registered via setWebhook in this header. Without it,
// anyone could POST forged updates carrying another user's `from.id`.
function hasValidSecret(request: Request, secret: string): boolean {
  const received = Buffer.from(request.headers.get("x-telegram-bot-api-secret-token") ?? "");
  const expected = Buffer.from(secret);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    status: "active",
    message: "SIWES Companion Telegram Webhook is live and ready"
  });
}

export async function POST(request: Request) {
  if (!env.telegramBotToken) {
    return NextResponse.json({ error: "Telegram is not configured" }, { status: 503 });
  }

  if (!env.telegramWebhookSecret) {
    console.error("TELEGRAM_WEBHOOK_SECRET is not set; refusing unauthenticated webhook updates.");
    return NextResponse.json({ error: "Telegram webhook secret is not configured" }, { status: 503 });
  }

  if (!hasValidSecret(request, env.telegramWebhookSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const update = (await request.json()) as { update_id?: number } & Record<string, unknown>;
    const telegram = new PrismaTelegramRepository();

    if (typeof update.update_id === "number" && !(await telegram.recordUpdate(String(update.update_id)))) {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    const bot = createTelegramBot({
      token: env.telegramBotToken,
      telegram,
      entries: new PrismaEntryRepository(),
      programmes: new PrismaProgrammeRepository(),
      generator: getDailyGenerator(),
      accounts: prismaTelegramAccounts,
      appUrl: env.appUrl
    });

    if (!cachedBotInfo) {
      await bot.init();
      cachedBotInfo = bot.botInfo;
    } else {
      bot.botInfo = cachedBotInfo;
    }

    await bot.handleUpdate(update as never);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

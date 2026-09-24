import { NextResponse } from "next/server";
import type { UserFromGetMe } from "grammy/types";
import { createTelegramBot } from "@/src/adapters/telegram/bot";
import { PrismaTelegramRepository } from "@/src/adapters/telegram/prisma-telegram-repository";
import { PrismaEntryRepository, PrismaProgrammeRepository } from "@/src/adapters/web/prisma-repositories";
import { getDailyGenerator } from "@/src/lib/daily-generator";
import { env } from "@/src/lib/env";

let cachedBotInfo: UserFromGetMe | null = null;

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
      generator: getDailyGenerator()
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

import { NextResponse } from "next/server";
import { createTelegramBot } from "@/src/adapters/telegram/bot";
import { PrismaTelegramRepository } from "@/src/adapters/telegram/prisma-telegram-repository";
import { PrismaEntryRepository, PrismaProgrammeRepository } from "@/src/adapters/web/prisma-repositories";
import { getDailyGenerator } from "@/src/lib/daily-generator";
import { env } from "@/src/lib/env";

export async function POST(request: Request) {
  if (!env.telegramBotToken) return NextResponse.json({ error: "Telegram is not configured" }, { status: 503 });
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET ?? env.telegramBotToken;
  if (request.headers.get("x-telegram-bot-api-secret-token") !== expectedSecret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const update = await request.json() as { update_id?: number } & Record<string, unknown>;
    const telegram = new PrismaTelegramRepository();
    if (typeof update.update_id === "number" && !(await telegram.recordUpdate(String(update.update_id)))) return NextResponse.json({ ok: true, duplicate: true });
    const bot = createTelegramBot({ token: env.telegramBotToken, telegram, entries: new PrismaEntryRepository(), programmes: new PrismaProgrammeRepository(), generator: getDailyGenerator() });
    await bot.handleUpdate(update as never);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

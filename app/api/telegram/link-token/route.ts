import { NextResponse } from "next/server";
import { createTelegramLinkToken } from "@/src/core/telegram/link-service";
import { PrismaTelegramRepository } from "@/src/adapters/telegram/prisma-telegram-repository";
import { getViewer } from "@/src/lib/viewer";
import { jsonError } from "@/src/lib/api";

export async function POST() {
  try {
    const viewer = await getViewer();
    if (!viewer) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required" } }, { status: 401 });
    const token = await createTelegramLinkToken(new PrismaTelegramRepository(), viewer.id);
    const botUsername = process.env.TELEGRAM_BOT_USERNAME ?? "your_bot_username";
    return NextResponse.json({ expiresAt: token.expiresAt.toISOString(), deepLink: `https://t.me/${botUsername}?start=${token.rawToken}` });
  } catch (error) {
    return jsonError(error);
  }
}

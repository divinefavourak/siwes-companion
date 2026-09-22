import { NextResponse } from "next/server";
import { getViewer } from "@/src/lib/viewer";
import { PrismaTelegramRepository } from "@/src/adapters/telegram/prisma-telegram-repository";
import { jsonError } from "@/src/lib/api";

export async function GET() {
  try {
    const viewer = await getViewer();
    if (!viewer) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required" } }, { status: 401 });

    const botUsername = process.env.TELEGRAM_BOT_USERNAME ?? "siwes_companion_bot";

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        linked: false,
        identity: null,
        botUsername
      });
    }

    const repository = new PrismaTelegramRepository();
    const identity = await repository.findIdentityByUserId(viewer.id);

    return NextResponse.json({
      linked: Boolean(identity),
      identity,
      botUsername
    });
  } catch (error) {
    return jsonError(error);
  }
}

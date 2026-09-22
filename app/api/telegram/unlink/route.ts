import { NextResponse } from "next/server";
import { getViewer } from "@/src/lib/viewer";
import { PrismaTelegramRepository } from "@/src/adapters/telegram/prisma-telegram-repository";
import { jsonError } from "@/src/lib/api";

export async function POST() {
  try {
    const viewer = await getViewer();
    if (!viewer) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required" } }, { status: 401 });

    if (process.env.DATABASE_URL) {
      const repository = new PrismaTelegramRepository();
      await repository.unlinkUser(viewer.id);
    }

    return NextResponse.json({ ok: true, message: "Telegram unlinked successfully" });
  } catch (error) {
    return jsonError(error);
  }
}

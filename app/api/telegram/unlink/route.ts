import { NextResponse } from "next/server";
import { getViewer } from "@/src/lib/viewer";
import { PrismaTelegramRepository } from "@/src/adapters/telegram/prisma-telegram-repository";
import { canSafelyUnlink } from "@/src/adapters/telegram/account-service";
import { jsonError } from "@/src/lib/api";

export async function POST() {
  try {
    const viewer = await getViewer();
    if (!viewer) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required" } }, { status: 401 });

    if (process.env.DATABASE_URL) {
      // A Telegram-created account signed in via the bot's link may have no password;
      // unlinking it would leave no way back in once this session expires.
      if (!(await canSafelyUnlink(viewer.id))) {
        return NextResponse.json(
          { error: { code: "CONFLICT", message: "Set a password in Settings → Password before disconnecting Telegram, or you'll lose access to this account." } },
          { status: 409 }
        );
      }
      const repository = new PrismaTelegramRepository();
      await repository.unlinkUser(viewer.id);
    }

    return NextResponse.json({ ok: true, message: "Telegram unlinked successfully" });
  } catch (error) {
    return jsonError(error);
  }
}

import { NextResponse } from "next/server";
import { confirmEmailToken } from "@/src/adapters/telegram/account-service";
import { sendTelegramView } from "@/src/adapters/telegram/telegram-sender";
import { emailConfirmedView, telegramConnectedView } from "@/src/adapters/telegram/views";
import { env } from "@/src/lib/env";
import { getViewer } from "@/src/lib/viewer";

export async function POST(request: Request) {
  const form = await request.formData();
  const token = String(form.get("token") ?? "");

  let status: string;
  try {
    const viewer = await getViewer();
    const result = await confirmEmailToken(token, viewer?.id ?? null);
    status = result.status;
    if (result.status === "sign_in_required") {
      // The token is still unused: sign in as the account owner, then come back to this page.
      const back = `/telegram/confirm?token=${encodeURIComponent(token)}`;
      return NextResponse.redirect(new URL(`/sign-in?callbackUrl=${encodeURIComponent(back)}`, env.appUrl), 303);
    }
    // Tell the student in the chat they came from, so they don't have to guess it worked.
    if (result.telegramUserId && result.email && (result.status === "verified" || result.status === "linked")) {
      await sendTelegramView(
        result.telegramUserId,
        result.status === "linked" ? telegramConnectedView(result.email) : emailConfirmedView(result.email)
      );
    }
  } catch (error) {
    console.error("Telegram email confirmation failed:", error);
    status = "expired";
  }

  // env.appUrl, not request.url: behind the tunnel the request host is the internal one.
  return NextResponse.redirect(new URL(`/telegram/confirm?result=${status}`, env.appUrl), 303);
}

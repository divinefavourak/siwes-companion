import { NextResponse } from "next/server";
import { confirmEmailToken } from "@/src/adapters/telegram/account-service";
import { sendTelegramView } from "@/src/adapters/telegram/telegram-sender";
import { emailConfirmedView, telegramConnectedView } from "@/src/adapters/telegram/views";
import { env } from "@/src/lib/env";

export async function POST(request: Request) {
  const form = await request.formData();
  const token = String(form.get("token") ?? "");

  let status: string;
  try {
    const result = await confirmEmailToken(token);
    status = result.status;
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

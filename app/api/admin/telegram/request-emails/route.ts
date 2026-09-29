import { NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/admin-auth";
import { prisma } from "@/src/lib/prisma";
import { jsonError } from "@/src/lib/api";
import { sendTelegramView } from "@/src/adapters/telegram/telegram-sender";
import { emailRequestView } from "@/src/adapters/telegram/views";

const withoutEmail = { user: { email: null, deletedAt: null } };

/** How many linked Telegram students have no email yet. */
export async function GET() {
  try {
    await requireAdmin();
    const count = await prisma.telegramIdentity.count({ where: withoutEmail });
    return NextResponse.json({ count });
  } catch (err) {
    return jsonError(err);
  }
}

/** Send each of them the "Add your email" card. */
export async function POST() {
  try {
    const admin = await requireAdmin();
    const identities = await prisma.telegramIdentity.findMany({
      where: withoutEmail,
      select: { telegramUserId: true, firstName: true, user: { select: { name: true } } }
    });

    let sent = 0;
    for (const identity of identities) {
      if (await sendTelegramView(identity.telegramUserId, emailRequestView(identity.firstName ?? identity.user.name))) sent++;
      // Telegram allows ~30 messages/second per bot; stay well under it.
      await new Promise((resolve) => setTimeout(resolve, 60));
    }

    await prisma.auditEvent.create({
      data: {
        userId: admin.userId,
        action: "TELEGRAM_EMAIL_REQUEST",
        entityType: "TelegramIdentity",
        entityId: "bulk",
        metadata: { total: identities.length, sent }
      }
    });

    return NextResponse.json({ total: identities.length, sent, failed: identities.length - sent });
  } catch (err) {
    return jsonError(err);
  }
}
